import "server-only"

import { generateText, Output } from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { topologyProposal } from "@/lib/db/schema"
import { TEAM_TAG } from "@/lib/constants"
import { AGENT_MODEL, AGENT_PROVIDER_OPTIONS, compactCi } from "@/lib/agents/shared"
import { getStagingCis } from "@/lib/queries"

const topologySchema = z.object({
  services: z.array(
    z.object({
      serviceName: z.string().describe("Business service name, e.g. 'Payments Platform'"),
      memberCiIds: z.array(z.number()).min(2),
      relationships: z.array(
        z.object({
          parent: z.number().describe("ci id of the depending component (e.g. app)"),
          child: z.number().describe("ci id of the depended-on component (e.g. server)"),
          type: z
            .enum(["runs_on", "depends_on", "connects_to", "hosted_on", "load_balances"])
            .describe("Relationship type"),
        })
      ),
      endpoints: z.array(
        z.object({
          url: z.string(),
          port: z.number().nullable(),
        })
      ),
      confidence: z.number().min(0).max(1),
      rationale: z
        .string()
        .describe("2-3 sentences on the evidence: naming, subnets, URLs, ports"),
    })
  ),
})

export async function runCartographer() {
  const cis = await getStagingCis()
  const compact = cis.map(compactCi)

  const { output } = await generateText({
    model: AGENT_MODEL,
    providerOptions: AGENT_PROVIDER_OPTIONS,
    output: Output.object({ schema: topologySchema }),
    system: `You are Cartographer, a CMDB service-mapping agent. From flat staged CI records, infer application services and their topology.

Evidence to use:
- Naming conventions: shared tokens across names (e.g. "pay", "crm", "inv") group CIs into a service.
- URLs and FQDNs: an application's url field pointing at a load balancer or server fqdn implies a dependency.
- Ports: db ports (5432, 3306, 1521) identify database tiers; 443/8080 identify web/app tiers.
- Subnets: components of one service often share an IP subnet.
- Classes: cmdb_ci_appl runs_on servers; apps depend_on db instances; load balancers load_balance apps or servers.

Rules:
- Only propose services with at least 2 member CIs and real supporting evidence.
- Every relationship's parent and child must be members of the service.
- Prefer 2-5 coherent services over one giant blob.
- confidence reflects evidence strength: naming+url+subnet agreement is 0.85+, naming alone is ~0.6.
- List concrete endpoints (from url/port fields) that a monitoring team could probe.`,
    prompt: `Staged CIs (JSON):\n${JSON.stringify(compact)}`,
  })

  await db.delete(topologyProposal).where(eq(topologyProposal.status, "pending"))

  const validIds = new Set(cis.map((c) => c.id))
  const rows = output.services
    .filter(
      (s) =>
        s.memberCiIds.length >= 2 &&
        s.memberCiIds.every((id) => validIds.has(id)) &&
        s.relationships.every(
          (r) => s.memberCiIds.includes(r.parent) && s.memberCiIds.includes(r.child)
        )
    )
    .map((s) => ({
      teamTag: TEAM_TAG,
      serviceName: s.serviceName,
      memberCiIds: s.memberCiIds,
      relationships: s.relationships,
      endpoints: s.endpoints,
      rationale: s.rationale,
      confidence: String(s.confidence),
      status: "pending",
    }))

  if (rows.length > 0) {
    await db.insert(topologyProposal).values(rows)
  }

  return {
    summary: `Mapped ${rows.length} candidate services from ${cis.length} staged CIs`,
    stats: { services: rows.length, cisScanned: cis.length },
  }
}
