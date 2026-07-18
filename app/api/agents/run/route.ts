import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { agentRun } from "@/lib/db/schema"
import { TEAM_TAG } from "@/lib/constants"
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

    for (const name of toRun) {
      const [run] = await db
        .insert(agentRun)
        .values({ teamTag: TEAM_TAG, agent: name, status: "running" })
        .returning({ id: agentRun.id })
      try {
        const result = await AGENTS[name]()
        results[name] = result
        await db
          .update(agentRun)
          .set({
            status: "succeeded",
            summary: result.summary,
            stats: result.stats,
            finishedAt: new Date(),
          })
          .where(eq(agentRun.id, run.id))
      } catch (agentError) {
        await db
          .update(agentRun)
          .set({
            status: "failed",
            summary: agentError instanceof Error ? agentError.message : "Unknown error",
            finishedAt: new Date(),
          })
          .where(eq(agentRun.id, run.id))
        throw agentError
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (error) {
    console.error("[v0] Agent pipeline error:", error)
    const message = error instanceof Error ? error.message : "Agent run failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
