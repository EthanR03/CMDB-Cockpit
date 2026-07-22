import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { agentRun } from "@/lib/db/schema"
import { TEAM_TAG } from "@/lib/constants"
import { captureAgentRunCompleteness } from "@/lib/agent-run-completeness"
import { runProfiler } from "@/lib/agents/profiler"
import { runIdentity } from "@/lib/agents/identity"
import { runRulewright } from "@/lib/agents/rulewright"
import { runCartographer } from "@/lib/agents/cartographer"

export const maxDuration = 300

const AGENTS: Record<string, () => Promise<{ summary: string; stats: Record<string, number> }>> = {
  profiler: runProfiler,
  identity: runIdentity,
  rulewright: runRulewright,
  cartographer: runCartographer,
}

function sanitizeAgentError(error: unknown) {
  if (!(error instanceof Error)) return "Unknown agent error"

  const firstLine = error.message.split(/\r?\n/, 1)[0]
  const provider = /gemini/i.test(firstLine)
    ? "Gemini"
    : /anthropic|claude/i.test(firstLine)
      ? "Anthropic"
      : "Provider"
  const status = firstLine.match(/\b[45]\d{2}\b/)?.[0]
  if (status) return `${provider} request returned ${status}`

  return firstLine
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(?:api[_-]?key|token|secret)\s*[:=]\s*\S+/gi, "credential=[redacted]")
    .replace(/\b(?:sk|key)-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .slice(0, 180)
}

export async function POST(req: Request) {
  let agent = "all"
  try {
    const body = await req.json().catch(() => ({}))
    agent = typeof body?.agent === "string" ? body.agent : "all"

    if (agent !== "all" && !AGENTS[agent]) {
      return NextResponse.json({ error: `Unknown agent: ${agent}` }, { status: 400 })
    }

    const toRun = agent === "all" ? Object.keys(AGENTS) : [agent]
    const results: Record<string, { summary: string; stats: Record<string, number> }> = {}
    const successfulAgents: Array<{ agent: string; status: "completed" }> = []
    const failedAgents: Array<{ agent: string; status: "failed"; error: string }> = []

    for (const name of toRun) {
      let runId: number
      try {
        const [run] = await db
          .insert(agentRun)
          .values({ teamTag: TEAM_TAG, agent: name, status: "running" })
          .returning({ id: agentRun.id })
        runId = run.id
      } catch (runStartError) {
        console.error(`[v0] Could not start ${name} agent run: ${sanitizeAgentError(runStartError)}`)
        failedAgents.push({
          agent: name,
          status: "failed",
          error: "Agent run could not be started",
        })
        continue
      }

      let beforeCaptured = false
      let afterCaptured = false
      try {
        await captureAgentRunCompleteness(runId, TEAM_TAG, "before")
        beforeCaptured = true
        const result = await AGENTS[name]()
        await captureAgentRunCompleteness(runId, TEAM_TAG, "after")
        afterCaptured = true
        results[name] = result
        await db
          .update(agentRun)
          .set({
            status: "succeeded",
            summary: result.summary,
            stats: result.stats,
            finishedAt: new Date(),
          })
          .where(and(eq(agentRun.id, runId), eq(agentRun.teamTag, TEAM_TAG)))
        successfulAgents.push({ agent: name, status: "completed" })
      } catch (agentError) {
        if (beforeCaptured && !afterCaptured) {
          try {
            await captureAgentRunCompleteness(runId, TEAM_TAG, "after")
          } catch (snapshotError) {
            console.error(
              `[v0] Could not capture after snapshot for ${name}: ${sanitizeAgentError(snapshotError)}`
            )
          }
        }

        const message = sanitizeAgentError(agentError)
        await db
          .update(agentRun)
          .set({
            status: "failed",
            summary: message,
            finishedAt: new Date(),
          })
          .where(and(eq(agentRun.id, runId), eq(agentRun.teamTag, TEAM_TAG)))
        failedAgents.push({ agent: name, status: "failed", error: message })
      }
    }

    const status =
      failedAgents.length === 0
        ? "completed"
        : successfulAgents.length > 0
          ? "partial_success"
          : "failed"

    return NextResponse.json(
      {
        ok: status !== "failed",
        status,
        results,
        successfulAgents,
        failedAgents,
      },
      { status: status === "failed" ? 500 : 200 }
    )
  } catch (error) {
    console.error(`[v0] Agent pipeline error: ${sanitizeAgentError(error)}`)
    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        error: "Agent pipeline could not begin",
        successfulAgents: [],
        failedAgents: [],
      },
      { status: 500 }
    )
  }
}
