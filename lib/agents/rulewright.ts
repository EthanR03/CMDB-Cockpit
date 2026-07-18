import "server-only"

import { generateText, Output } from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { ireRuleProposal } from "@/lib/db/schema"
import { TEAM_TAG } from "@/lib/constants"
import { AGENT_MODEL, AGENT_PROVIDER_OPTIONS, coveragePct } from "@/lib/agents/shared"
import { getStagingCis } from "@/lib/queries"

const ruleSchema = z.object({
  rules: z.array(
    z.object({
      ciClass: z.string().describe("The cmdb_ci_* class this rule applies to"),
      ruleName: z.string().describe("Human-readable rule name"),
      criteria: z
        .array(
          z.object({
            priority: z.number().describe("1 = tried first"),
            attributes: z
              .array(z.string())
              .describe("Field names that together uniquely identify a CI"),
            allowNull: z.boolean().describe("Whether partial nulls are tolerated"),
          })
        )
        .describe("Ordered identification criteria, strongest first"),
      rationale: z
        .string()
        .describe("Why these criteria, referencing the observed field coverage"),
    })
  ),
})

const IDENTIFIER_FIELDS = [
  "serialNumber",
  "macAddress",
  "ipAddress",
  "fqdn",
  "name",
  "url",
  "port",
  "model",
] as const

export async function runRulewright() {
  const cis = await getStagingCis()

  const classes = Array.from(new Set(cis.map((c) => c.ciClass)))
  const coverageByClass = classes.map((cls) => {
    const classCis = cis.filter((c) => c.ciClass === cls)
    return {
      ciClass: cls,
      count: classCis.length,
      coverage: IDENTIFIER_FIELDS.map((f) => ({
        attribute: f,
        pct: coveragePct(classCis, f),
      })),
    }
  })

  const { output } = await generateText({
    model: AGENT_MODEL,
    providerOptions: AGENT_PROVIDER_OPTIONS,
    output: Output.object({ schema: ruleSchema }),
    system: `You are Rulewright, an agent that authors ServiceNow IRE (Identification and Reconciliation Engine) identification rules.

You are given, per CI class, the percentage of staged records that have each identifier field populated ("coverage").

Rules for authoring:
- Propose exactly one rule per CI class present in the data.
- Criteria are ordered: priority 1 is the strongest identifier that also has high coverage. Never lead with a field below 60% coverage.
- Prefer globally-unique identifiers (serial_number, mac_address) over reusable ones (ip_address, name).
- Combine weak fields to make a strong criterion (e.g. name + ip_address).
- Use snake_case ServiceNow-style attribute names in criteria: serial_number, mac_address, ip_address, fqdn, name, url, port, model_id.
- allowNull true only for fallback criteria (priority 3+).
- The rationale must reference the actual coverage numbers.`,
    prompt: `Field coverage per class (JSON):\n${JSON.stringify(coverageByClass)}`,
  })

  await db.delete(ireRuleProposal).where(eq(ireRuleProposal.status, "pending"))

  const coverageLookup = new Map(coverageByClass.map((c) => [c.ciClass, c.coverage]))

  const FIELD_TO_SNAKE: Record<string, string> = {
    serialNumber: "serial_number",
    macAddress: "mac_address",
    ipAddress: "ip_address",
    fqdn: "fqdn",
    name: "name",
    url: "url",
    port: "port",
    model: "model_id",
  }

  const rows = output.rules
    .filter((r) => classes.includes(r.ciClass))
    .map((r) => ({
      teamTag: TEAM_TAG,
      ciClass: r.ciClass,
      ruleName: r.ruleName,
      criteria: r.criteria,
      coverage: (coverageLookup.get(r.ciClass) ?? []).map((c) => ({
        attribute: FIELD_TO_SNAKE[c.attribute] ?? c.attribute,
        pct: c.pct,
      })),
      rationale: r.rationale,
      status: "pending",
    }))

  if (rows.length > 0) {
    await db.insert(ireRuleProposal).values(rows)
  }

  return {
    summary: `Authored ${rows.length} IRE rule proposals covering ${classes.length} CI classes`,
    stats: { rules: rows.length, classes: classes.length },
  }
}
