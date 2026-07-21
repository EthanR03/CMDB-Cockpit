import "server-only"

import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { TEAM_TAG } from "@/lib/constants"
import { db } from "@/lib/db"
import { stagingCi } from "@/lib/db/schema"

const positiveId = z.number().int().positive()
const timestamp = z.union([z.date(), z.string().datetime({ offset: true })]).transform((value) =>
  value instanceof Date ? value : new Date(value)
)

export const mergeRemediationPayloadSchema = z
  .object({
    clusterId: positiveId,
    survivorId: positiveId,
    mergedIds: z.array(positiveId).min(1),
    clusterKey: z.string().trim().min(1),
  })
  .strict()
  .superRefine(({ mergedIds, survivorId }, context) => {
    if (new Set(mergedIds).size !== mergedIds.length) {
      context.addIssue({
        code: "custom",
        path: ["mergedIds"],
        message: "mergedIds must not contain duplicate IDs",
      })
    }

    if (mergedIds.includes(survivorId)) {
      context.addIssue({
        code: "custom",
        path: ["mergedIds"],
        message: "mergedIds must not contain survivorId",
      })
    }
  })

export const restoredStagingCiSchema = z
  .object({
    id: positiveId,
    teamTag: z.string().min(1),
    source: z.string().min(1),
    ciClass: z.string().min(1),
    name: z.string().min(1),
    serialNumber: z.string().nullable(),
    macAddress: z.string().nullable(),
    ipAddress: z.string().nullable(),
    fqdn: z.string().nullable(),
    port: z.number().int().nullable(),
    url: z.string().nullable(),
    owner: z.string().nullable(),
    supportGroup: z.string().nullable(),
    environment: z.string().nullable(),
    lifecycleStatus: z.string().nullable(),
    os: z.string().nullable(),
    model: z.string().nullable(),
    location: z.string().nullable(),
    lastDiscovered: timestamp.nullable(),
    raw: z.json().nullable(),
    createdAt: timestamp,
  })
  .strict()

export const mergeRemediationRollbackSchema = z
  .object({
    restoredRecords: z.array(restoredStagingCiSchema).min(1),
  })
  .strict()
  .superRefine(({ restoredRecords }, context) => {
    const ids = restoredRecords.map(({ id }) => id)
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["restoredRecords"],
        message: "restoredRecords must not contain duplicate IDs",
      })
    }
  })

export type MergeRemediationPayload = z.infer<typeof mergeRemediationPayloadSchema>
export type MergeRemediationRollback = z.infer<typeof mergeRemediationRollbackSchema>

export type MergeExecutionResult = {
  actionType: "merge_duplicates"
  survivorId: number
  removedIds: number[]
  removedCount: number
}

export type MergeRollbackResult = {
  actionType: "merge_duplicates"
  restoredIds: number[]
  restoredCount: number
  alreadyRestored: boolean
}

export function parseMergeRemediationPayload(value: unknown): MergeRemediationPayload {
  return mergeRemediationPayloadSchema.parse(value)
}

export function parseMergeRemediationRollback(value: unknown): MergeRemediationRollback {
  return mergeRemediationRollbackSchema.parse(value)
}

function requireExpectedTeam(expectedTeam: string) {
  if (expectedTeam.trim().length === 0) {
    throw new Error("Expected team must be non-empty")
  }
}

function comparableRecord(record: z.infer<typeof restoredStagingCiSchema>) {
  return {
    ...record,
    lastDiscovered: record.lastDiscovered?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  }
}

function recordsMatch(
  existing: z.infer<typeof restoredStagingCiSchema>,
  snapshot: z.infer<typeof restoredStagingCiSchema>
) {
  return JSON.stringify(comparableRecord(existing)) === JSON.stringify(comparableRecord(snapshot))
}

export async function executeMergeRemediation(
  payloadValue: unknown,
  expectedTeam: string = TEAM_TAG
): Promise<MergeExecutionResult> {
  requireExpectedTeam(expectedTeam)
  const payload = parseMergeRemediationPayload(payloadValue)
  const requestedIds = [payload.survivorId, ...payload.mergedIds]

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(stagingCi)
      .where(inArray(stagingCi.id, requestedIds))
      .for("update")

    const byId = new Map(rows.map((row) => [row.id, row]))
    const survivor = byId.get(payload.survivorId)
    if (!survivor) {
      throw new Error(`Merge survivor ${payload.survivorId} does not exist`)
    }
    if (survivor.teamTag !== expectedTeam) {
      throw new Error(`Merge survivor ${payload.survivorId} belongs to another team`)
    }

    const missingIds = payload.mergedIds.filter((id) => !byId.has(id))
    if (missingIds.length > 0) {
      throw new Error(
        `Merge already applied or missing rows: ${missingIds.join(", ")}`
      )
    }

    const crossTeamIds = payload.mergedIds.filter(
      (id) => byId.get(id)?.teamTag !== expectedTeam
    )
    if (crossTeamIds.length > 0) {
      throw new Error(`Cannot merge rows belonging to another team: ${crossTeamIds.join(", ")}`)
    }

    const deleted = await tx
      .delete(stagingCi)
      .where(
        and(
          eq(stagingCi.teamTag, expectedTeam),
          inArray(stagingCi.id, payload.mergedIds)
        )
      )
      .returning({ id: stagingCi.id })

    if (deleted.length !== payload.mergedIds.length) {
      throw new Error(
        `Merge deletion count mismatch: expected ${payload.mergedIds.length}, deleted ${deleted.length}`
      )
    }

    const removedIds = deleted.map(({ id }) => id).sort((a, b) => a - b)
    return {
      actionType: "merge_duplicates",
      survivorId: payload.survivorId,
      removedIds,
      removedCount: removedIds.length,
    }
  })
}

export async function rollbackMergeRemediation(
  rollbackValue: unknown,
  expectedTeam: string = TEAM_TAG,
  survivorId?: number
): Promise<MergeRollbackResult> {
  requireExpectedTeam(expectedTeam)
  const rollback = parseMergeRemediationRollback(rollbackValue)
  const restoredIds = rollback.restoredRecords.map(({ id }) => id).sort((a, b) => a - b)

  if (survivorId !== undefined) {
    positiveId.parse(survivorId)
    if (restoredIds.includes(survivorId)) {
      throw new Error(`Rollback snapshot must not contain survivor ${survivorId}`)
    }
  }

  const crossTeamIds = rollback.restoredRecords
    .filter(({ teamTag }) => teamTag !== expectedTeam)
    .map(({ id }) => id)
  if (crossTeamIds.length > 0) {
    throw new Error(`Cannot restore rows belonging to another team: ${crossTeamIds.join(", ")}`)
  }

  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(stagingCi)
      .where(inArray(stagingCi.id, restoredIds))
      .for("update")

    if (existingRows.length > 0) {
      const snapshotsById = new Map(
        rollback.restoredRecords.map((record) => [record.id, record])
      )
      const allPresent = existingRows.length === rollback.restoredRecords.length
      const allMatch =
        allPresent &&
        existingRows.every((row) => {
          const snapshot = snapshotsById.get(row.id)
          return snapshot !== undefined && recordsMatch(restoredStagingCiSchema.parse(row), snapshot)
        })

      if (allMatch) {
        return {
          actionType: "merge_duplicates",
          restoredIds,
          restoredCount: 0,
          alreadyRestored: true,
        }
      }

      const existingIds = existingRows.map(({ id }) => id).sort((a, b) => a - b)
      throw new Error(
        `Rollback rows already exist partially or conflict with the snapshot: ${existingIds.join(", ")}`
      )
    }

    const inserted = await tx
      .insert(stagingCi)
      .values(rollback.restoredRecords)
      .returning({ id: stagingCi.id })

    if (inserted.length !== rollback.restoredRecords.length) {
      throw new Error(
        `Rollback insertion count mismatch: expected ${rollback.restoredRecords.length}, inserted ${inserted.length}`
      )
    }

    return {
      actionType: "merge_duplicates",
      restoredIds: inserted.map(({ id }) => id).sort((a, b) => a - b),
      restoredCount: inserted.length,
      alreadyRestored: false,
    }
  })
}
