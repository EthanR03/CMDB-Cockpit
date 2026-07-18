import "server-only"

import { generateText, Output } from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { dupCluster } from "@/lib/db/schema"
import { TEAM_TAG } from "@/lib/constants"
import { AGENT_MODEL, AGENT_PROVIDER_OPTIONS, compactCi, norm } from "@/lib/agents/shared"
import { getStagingCis } from "@/lib/queries"
import type { StagingCi } from "@/lib/db/schema"

const clusterSchema = z.object({
  clusters: z.array(
    z.object({
      clusterKey: z
        .string()
        .describe("Short slug identifying the cluster, e.g. 'srv-payments-01'"),
      ciIds: z.array(z.number()).min(2).describe("Staging ids of the duplicate records"),
      survivorId: z
        .number()
        .describe("The ci id that should survive the merge (most complete/authoritative)"),
      confidence: z.number().min(0).max(1),
      rationale: z
        .string()
        .describe("2-3 sentences: why these are the same real-world CI, why this survivor"),
      evidence: z.object({
        matchedOn: z.array(z.string()).describe("Fields that matched, e.g. serial, mac"),
        conflicts: z.array(z.string()).describe("Fields that conflict between records"),
      }),
    })
  ),
})

/** Cheap deterministic pre-pass: bucket CIs likely to be duplicates so the LLM only judges candidates. */
function candidateGroups(cis: StagingCi[]): StagingCi[][] {
  const buckets = new Map<string, StagingCi[]>()

  function add(key: string, ci: StagingCi) {
    if (!key) return
    const list = buckets.get(key) ?? []
    if (!list.some((c) => c.id === ci.id)) list.push(ci)
    buckets.set(key, list)
  }

  for (const ci of cis) {
    if (ci.serialNumber) add(`sn:${norm(ci.serialNumber)}`, ci)
    if (ci.macAddress) add(`mac:${norm(ci.macAddress)}`, ci)
    if (ci.ipAddress) add(`ip:${norm(ci.ipAddress)}`, ci)
    if (ci.fqdn) add(`fqdn:${norm(ci.fqdn)}`, ci)
    // name prefix bucket to catch "srv-pay-01" vs "SRV-PAY-01.corp.local"
    add(`nm:${norm(ci.name).slice(0, 10)}`, ci)
  }

  // union-find style merge of overlapping buckets
  const parent = new Map<number, number>()
  const find = (x: number): number => {
    let r = x
    while (parent.get(r) !== undefined && parent.get(r) !== r) r = parent.get(r)!
    parent.set(x, r)
    return r
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const ci of cis) parent.set(ci.id, ci.id)
  for (const list of buckets.values()) {
    if (list.length < 2) continue
    for (let i = 1; i < list.length; i++) union(list[0].id, list[i].id)
  }

  const groups = new Map<number, StagingCi[]>()
  for (const ci of cis) {
    const root = find(ci.id)
    const g = groups.get(root) ?? []
    g.push(ci)
    groups.set(root, g)
  }

  return Array.from(groups.values()).filter((g) => g.length >= 2)
}

export async function runIdentity() {
  const cis = await getStagingCis()
  const groups = candidateGroups(cis)

  const candidatePayload = groups.map((g, i) => ({
    group: i + 1,
    records: g.map(compactCi),
  }))

  const { output } = await generateText({
    model: AGENT_MODEL,
    providerOptions: AGENT_PROVIDER_OPTIONS,
    output: Output.object({ schema: clusterSchema }),
    system: `You are Identity, a CMDB reconciliation agent. You are given candidate groups of staged CI records that a deterministic blocking pass flagged as potentially duplicated (matching serial, MAC, IP, FQDN, or similar names).

Your job:
- For each group, decide which records are truly the SAME real-world CI. Split a group if it contains distinct CIs.
- Serial number match is near-conclusive. MAC match is very strong. IP alone is weak (IPs get reused). Name similarity alone needs corroboration.
- Choose the survivor: the record with the most complete, most recently discovered, best-normalized data.
- Report matched fields and conflicting fields as evidence.
- confidence: 0.95+ for serial matches, 0.8-0.95 for mac/fqdn, below 0.8 for weaker evidence.
- Only output clusters of 2 or more records that you genuinely believe are duplicates. It is fine to output no cluster for a group of coincidental matches.`,
    prompt: `Candidate groups (JSON):\n${JSON.stringify(candidatePayload)}`,
  })

  // Replace previous clusters that are still pending (keep reviewed ones)
  await db.delete(dupCluster).where(eq(dupCluster.status, "pending"))

  const validIds = new Set(cis.map((c) => c.id))
  const rows = output.clusters
    .filter(
      (c) =>
        c.ciIds.every((id) => validIds.has(id)) &&
        c.ciIds.includes(c.survivorId) &&
        c.ciIds.length >= 2
    )
    .map((c) => ({
      teamTag: TEAM_TAG,
      clusterKey: c.clusterKey,
      ciIds: c.ciIds,
      survivorId: c.survivorId,
      confidence: String(c.confidence),
      rationale: c.rationale,
      evidence: c.evidence,
      status: "pending",
    }))

  if (rows.length > 0) {
    await db.insert(dupCluster).values(rows)
  }

  return {
    summary: `Proposed ${rows.length} duplicate clusters from ${groups.length} candidate groups`,
    stats: { clusters: rows.length, candidateGroups: groups.length },
  }
}
