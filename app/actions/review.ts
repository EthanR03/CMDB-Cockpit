"use server"

import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  decision,
  dupCluster,
  ireRuleProposal,
  remediation,
  stagingCi,
  topologyProposal,
} from "@/lib/db/schema"
import { TEAM_TAG } from "@/lib/constants"

export async function reviewDupCluster(
  clusterId: number,
  verdict: "approved" | "rejected",
  note?: string
) {
  const [cluster] = await db
    .select()
    .from(dupCluster)
    .where(and(eq(dupCluster.id, clusterId), eq(dupCluster.teamTag, TEAM_TAG)))

  if (!cluster) throw new Error("Cluster not found")

  await db
    .update(dupCluster)
    .set({ status: verdict })
    .where(eq(dupCluster.id, clusterId))

  await db.insert(decision).values({
    teamTag: TEAM_TAG,
    entityType: "dup_cluster",
    entityId: clusterId,
    decision: verdict,
    note: note ?? null,
  })

  if (verdict === "approved" && cluster.survivorId) {
    const losers = (cluster.ciIds as number[]).filter((id) => id !== cluster.survivorId)
    const loserRows = await db
      .select()
      .from(stagingCi)
      .where(inArray(stagingCi.id, losers))

    await db.insert(remediation).values({
      teamTag: TEAM_TAG,
      actionType: "merge_duplicates",
      targetCiId: cluster.survivorId,
      payload: {
        clusterId,
        survivorId: cluster.survivorId,
        mergedIds: losers,
        clusterKey: cluster.clusterKey,
      },
      rollback: { restoredRecords: loserRows },
    })
  }

  revalidatePath("/duplicates")
  revalidatePath("/remediation")
  revalidatePath("/")
  revalidatePath("/audit")
}

export async function reviewIreRule(
  ruleId: number,
  verdict: "approved" | "rejected",
  note?: string
) {
  const [rule] = await db
    .select()
    .from(ireRuleProposal)
    .where(and(eq(ireRuleProposal.id, ruleId), eq(ireRuleProposal.teamTag, TEAM_TAG)))

  if (!rule) throw new Error("Rule proposal not found")

  await db
    .update(ireRuleProposal)
    .set({ status: verdict })
    .where(eq(ireRuleProposal.id, ruleId))

  await db.insert(decision).values({
    teamTag: TEAM_TAG,
    entityType: "ire_rule",
    entityId: ruleId,
    decision: verdict,
    note: note ?? null,
  })

  if (verdict === "approved") {
    await db.insert(remediation).values({
      teamTag: TEAM_TAG,
      actionType: "publish_ire_rule",
      targetCiId: null,
      payload: {
        ruleId,
        ciClass: rule.ciClass,
        ruleName: rule.ruleName,
        criteria: rule.criteria,
      },
      rollback: { action: "retract_ire_rule", ruleId },
    })
  }

  revalidatePath("/rules")
  revalidatePath("/remediation")
  revalidatePath("/")
  revalidatePath("/audit")
}

export async function reviewTopology(
  topologyId: number,
  verdict: "approved" | "rejected",
  note?: string
) {
  const [topo] = await db
    .select()
    .from(topologyProposal)
    .where(
      and(eq(topologyProposal.id, topologyId), eq(topologyProposal.teamTag, TEAM_TAG))
    )

  if (!topo) throw new Error("Topology proposal not found")

  await db
    .update(topologyProposal)
    .set({ status: verdict })
    .where(eq(topologyProposal.id, topologyId))

  await db.insert(decision).values({
    teamTag: TEAM_TAG,
    entityType: "topology",
    entityId: topologyId,
    decision: verdict,
    note: note ?? null,
  })

  if (verdict === "approved") {
    await db.insert(remediation).values({
      teamTag: TEAM_TAG,
      actionType: "create_service_map",
      targetCiId: null,
      payload: {
        topologyId,
        serviceName: topo.serviceName,
        memberCiIds: topo.memberCiIds,
        relationships: topo.relationships,
      },
      rollback: { action: "delete_service_map", topologyId },
    })
  }

  revalidatePath("/map")
  revalidatePath("/remediation")
  revalidatePath("/")
  revalidatePath("/audit")
}

export async function applyRemediation(remediationId: number) {
  await db
    .update(remediation)
    .set({ status: "applied", appliedAt: new Date() })
    .where(and(eq(remediation.id, remediationId), eq(remediation.teamTag, TEAM_TAG)))

  await db.insert(decision).values({
    teamTag: TEAM_TAG,
    entityType: "remediation",
    entityId: remediationId,
    decision: "applied",
  })

  revalidatePath("/remediation")
  revalidatePath("/audit")
  revalidatePath("/")
}

export async function rollbackRemediation(remediationId: number) {
  await db
    .update(remediation)
    .set({ status: "rolled_back" })
    .where(and(eq(remediation.id, remediationId), eq(remediation.teamTag, TEAM_TAG)))

  await db.insert(decision).values({
    teamTag: TEAM_TAG,
    entityType: "remediation",
    entityId: remediationId,
    decision: "rolled_back",
  })

  revalidatePath("/remediation")
  revalidatePath("/audit")
  revalidatePath("/")
}
