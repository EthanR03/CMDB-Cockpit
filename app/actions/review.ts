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
  type StagingCi,
} from "@/lib/db/schema"
import { TEAM_TAG } from "@/lib/constants"
import {
  describeServiceNowError,
  isServiceNowEnabled,
  snCreateIdentificationRule,
  snIdentifyReconcile,
  snStageCi,
  type IreCriteriaEntry,
} from "@/lib/servicenow"

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

    // Push the approved rule into ServiceNow as cmdb_identifier records.
    // Failure never unwinds the local approval — it is recorded on the row.
    if (isServiceNowEnabled()) {
      try {
        const created = await snCreateIdentificationRule({
          ciClass: rule.ciClass,
          ruleName: rule.ruleName,
          criteria: rule.criteria as IreCriteriaEntry[],
          rationale: rule.rationale,
        })
        await db
          .update(ireRuleProposal)
          .set({
            snSyncStatus: "created",
            snSyncError: null,
            snIdentifierSysId: created.identifierSysId,
            snEntrySysIds: created.entrySysIds,
          })
          .where(eq(ireRuleProposal.id, ruleId))
      } catch (err) {
        await db
          .update(ireRuleProposal)
          .set({ snSyncStatus: "failed", snSyncError: describeServiceNowError(err) })
          .where(eq(ireRuleProposal.id, ruleId))
      }
    }
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
  const [item] = await db
    .select()
    .from(remediation)
    .where(and(eq(remediation.id, remediationId), eq(remediation.teamTag, TEAM_TAG)))

  if (!item) throw new Error("Remediation not found")

  // Promotion: approved CI → scoped staging table → identifyreconcile.
  // Local apply proceeds either way; the ServiceNow outcome lands on the row.
  let snPromotionStatus: string | null = null
  let snResult: unknown = null

  if (isServiceNowEnabled() && item.targetCiId) {
    try {
      const [ci] = await db
        .select()
        .from(stagingCi)
        .where(and(eq(stagingCi.id, item.targetCiId), eq(stagingCi.teamTag, TEAM_TAG)))
      if (!ci) throw new Error(`Staging CI ${item.targetCiId} not found`)

      const staged = await snStageCi(toStagingFields(ci))
      const reconcile = await snIdentifyReconcile([
        { className: ci.ciClass, values: toIreValues(ci) },
      ])
      snPromotionStatus = "promoted"
      snResult = {
        stagingTable: staged.table,
        stagedSysId: staged.sysId,
        identifyReconcile: reconcile,
      }
    } catch (err) {
      snPromotionStatus = "failed"
      snResult = { error: describeServiceNowError(err) }
    }
  }

  await db
    .update(remediation)
    .set({ status: "applied", appliedAt: new Date(), snPromotionStatus, snResult })
    .where(eq(remediation.id, remediationId))

  await db.insert(decision).values({
    teamTag: TEAM_TAG,
    entityType: "remediation",
    entityId: remediationId,
    decision: "applied",
    note: snPromotionStatus ? `ServiceNow promotion: ${snPromotionStatus}` : null,
  })

  revalidatePath("/remediation")
  revalidatePath("/audit")
  revalidatePath("/")
}

// Column names mirror staging_ci — C's scoped table uses the same shape.
function toStagingFields(ci: StagingCi): Record<string, string> {
  const fields: Record<string, string | number | null> = {
    source: ci.source,
    ci_class: ci.ciClass,
    name: ci.name,
    serial_number: ci.serialNumber,
    mac_address: ci.macAddress,
    ip_address: ci.ipAddress,
    fqdn: ci.fqdn,
    port: ci.port,
    url: ci.url,
    owner: ci.owner,
    support_group: ci.supportGroup,
    environment: ci.environment,
    lifecycle_status: ci.lifecycleStatus,
    os: ci.os,
    model: ci.model,
    location: ci.location,
  }
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)])
  )
}

// Identity attributes IRE matches on — must be real fields on the CI class.
function toIreValues(ci: StagingCi): Record<string, string> {
  const values: Record<string, string | null> = {
    name: ci.name,
    serial_number: ci.serialNumber,
    mac_address: ci.macAddress,
    ip_address: ci.ipAddress,
    fqdn: ci.fqdn,
  }
  return Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== null && v !== undefined && v !== "")
  ) as Record<string, string>
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
