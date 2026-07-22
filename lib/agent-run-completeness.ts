import "server-only"

import { and, asc, desc, eq } from "drizzle-orm"
import { calculateCompletenessByClass } from "@/lib/completeness"
import { db } from "@/lib/db"
import {
  agentRun,
  agentRunCompletenessSnapshot,
  stagingCi,
} from "@/lib/db/schema"

export type CompletenessSnapshotPhase = "before" | "after"

export async function captureAgentRunCompleteness(
  agentRunId: number,
  teamTag: string,
  phase: CompletenessSnapshotPhase
) {
  return db.transaction(async (tx) => {
    const [run] = await tx
      .select({ id: agentRun.id })
      .from(agentRun)
      .where(and(eq(agentRun.id, agentRunId), eq(agentRun.teamTag, teamTag)))

    if (!run) throw new Error("Agent run not found for completeness snapshot")

    const cis = await tx
      .select()
      .from(stagingCi)
      .where(eq(stagingCi.teamTag, teamTag))
    const snapshots = calculateCompletenessByClass(cis).map((snapshot) => ({
      agentRunId,
      teamTag,
      phase,
      ...snapshot,
    }))

    if (snapshots.length === 0) return []

    return tx
      .insert(agentRunCompletenessSnapshot)
      .values(snapshots)
      .onConflictDoNothing({
        target: [
          agentRunCompletenessSnapshot.agentRunId,
          agentRunCompletenessSnapshot.ciClass,
          agentRunCompletenessSnapshot.phase,
        ],
      })
      .returning()
  })
}

export async function getLatestCompletenessComparison(teamTag: string) {
  const [latest] = await db
    .select({ agentRunId: agentRunCompletenessSnapshot.agentRunId })
    .from(agentRunCompletenessSnapshot)
    .innerJoin(
      agentRun,
      and(
        eq(agentRun.id, agentRunCompletenessSnapshot.agentRunId),
        eq(agentRun.teamTag, agentRunCompletenessSnapshot.teamTag)
      )
    )
    .where(eq(agentRunCompletenessSnapshot.teamTag, teamTag))
    .orderBy(desc(agentRun.startedAt))
    .limit(1)

  if (!latest) return null

  const [run, snapshots] = await Promise.all([
    db
      .select()
      .from(agentRun)
      .where(and(eq(agentRun.id, latest.agentRunId), eq(agentRun.teamTag, teamTag)))
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(agentRunCompletenessSnapshot)
      .where(
        and(
          eq(agentRunCompletenessSnapshot.agentRunId, latest.agentRunId),
          eq(agentRunCompletenessSnapshot.teamTag, teamTag)
        )
      )
      .orderBy(asc(agentRunCompletenessSnapshot.ciClass)),
  ])

  if (!run) return null

  const byClass = new Map<
    string,
    {
      before?: (typeof snapshots)[number]
      after?: (typeof snapshots)[number]
    }
  >()

  for (const snapshot of snapshots) {
    const entry = byClass.get(snapshot.ciClass) ?? {}
    if (snapshot.phase === "before") entry.before = snapshot
    if (snapshot.phase === "after") entry.after = snapshot
    byClass.set(snapshot.ciClass, entry)
  }

  return {
    agentRunId: run.id,
    agent: run.agent,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    classes: Array.from(byClass.entries()).map(([ciClass, phases]) => ({
      ciClass,
      beforePercent: phases.before?.completenessPercent ?? null,
      afterPercent: phases.after?.completenessPercent ?? null,
      changePercentagePoints:
        phases.before && phases.after
          ? phases.after.completenessPercent - phases.before.completenessPercent
          : null,
      beforeCompleteCount: phases.before?.completeCount ?? null,
      afterCompleteCount: phases.after?.completeCount ?? null,
      beforeTotalCount: phases.before?.totalCount ?? null,
      afterTotalCount: phases.after?.totalCount ?? null,
      totalCount: phases.after?.totalCount ?? phases.before?.totalCount ?? 0,
    })),
  }
}
