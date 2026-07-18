import "server-only"

import { generateText, Output } from "ai"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { finding } from "@/lib/db/schema"
import { TEAM_TAG, GAP_CATEGORIES } from "@/lib/constants"
import { AGENT_MODEL, AGENT_PROVIDER_OPTIONS, compactCi } from "@/lib/agents/shared"
import { getStagingCis } from "@/lib/queries"

const findingSchema = z.object({
  findings: z.array(
    z.object({
      ciId: z.number().describe("The staging CI id the finding applies to"),
      category: z
        .enum([
          "missing_owner",
          "missing_identifier",
          "inconsistent_naming",
          "stale_record",
          "lifecycle_mismatch",
          "class_misassignment",
          "data_quality",
        ])
        .describe("Gap category"),
      severity: z.enum(["critical", "high", "medium", "low"]),
      field: z.string().nullable().describe("The specific field at fault, if any"),
      message: z.string().describe("One-sentence, specific explanation citing the actual value"),
    })
  ),
})

const BATCH_SIZE = 25

export async function runProfiler() {
  const cis = await getStagingCis()

  const categories = Object.entries(GAP_CATEGORIES)
    .map(([k, v]) => `- ${k}: ${v.description}`)
    .join("\n")

  const system = `You are Profiler, a CMDB data-quality agent. You sweep staged configuration items (CIs) and file gap findings.

Gap categories:
${categories}

Rules:
- Only file findings you can justify from the record itself. Cite actual field values in messages.
- missing_owner: owner AND group both empty is critical; one empty is high.
- missing_identifier: for hardware/server classes, no serial AND no mac AND no ip is critical.
- stale_record: lastSeen older than 90 days before today (${new Date().toISOString().slice(0, 10)}).
- data_quality: malformed values (bad MAC format, placeholder text like "TBD"/"unknown", inconsistent casing of env values, serials with whitespace).
- inconsistent_naming: names that break the dominant convention of their class (look at sibling names in the same batch).
- lifecycle_mismatch: e.g. lifecycle "retired" but discovered recently, or "operational" with no discovery date.
- class_misassignment: attributes that clearly belong to another class (e.g. a "server" with a load-balancer VIP naming pattern).
- Be thorough but do not invent gaps. A clean record gets zero findings.
- Keep messages to one short sentence each.`

  // Replace previous profiler findings up front; batches then append.
  await db
    .delete(finding)
    .where(and(eq(finding.teamTag, TEAM_TAG), eq(finding.agent, "profiler")))

  const validIds = new Set(cis.map((c) => c.id))
  let totalRows = 0
  const touchedCis = new Set<number>()

  // Small batches keep each API call fast (avoids header timeouts on
  // long single-shot generations) and bound the output size per call.
  for (let i = 0; i < cis.length; i += BATCH_SIZE) {
    const batch = cis.slice(i, i + BATCH_SIZE)
    const compact = batch.map(compactCi)

    const { output } = await generateText({
      model: AGENT_MODEL,
    providerOptions: AGENT_PROVIDER_OPTIONS,
      output: Output.object({ schema: findingSchema }),
      maxOutputTokens: 8000,
      system,
      prompt: `Staged CIs (JSON):\n${JSON.stringify(compact)}`,
    })

    const rows = output.findings
      .filter((f) => validIds.has(f.ciId))
      .map((f) => ({
        teamTag: TEAM_TAG,
        ciId: f.ciId,
        category: f.category,
        severity: f.severity,
        field: f.field,
        message: f.message,
        agent: "profiler",
        status: "open",
      }))

    if (rows.length > 0) {
      await db.insert(finding).values(rows)
      totalRows += rows.length
      for (const r of rows) touchedCis.add(r.ciId)
    }
  }

  return {
    summary: `Filed ${totalRows} findings across ${touchedCis.size} CIs`,
    stats: { findings: totalRows, cisScanned: cis.length },
  }
}
