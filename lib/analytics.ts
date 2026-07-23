import "server-only"

import { getLatestCompletenessComparison } from "@/lib/agent-run-completeness"
import { COMPLETENESS_FIELDS, hasCompletenessValue } from "@/lib/completeness"
import { TEAM_TAG } from "@/lib/constants"
import {
  getAgentRuns,
  getDupClusters,
  getFindings,
  getIreRuleProposals,
  getRemediations,
  getStagingCis,
  getTopologyProposals,
} from "@/lib/queries"

export async function getDashboardData() {
  const [cis, findings, clusters, rules, topologies, remediations, runs, runCompleteness] =
    await Promise.all([
      getStagingCis(),
      getFindings(),
      getDupClusters(),
      getIreRuleProposals(),
      getTopologyProposals(),
      getRemediations(),
      getAgentRuns(),
      getLatestCompletenessComparison(TEAM_TAG),
    ])

  const total = cis.length

  const completeness = COMPLETENESS_FIELDS.map(({ key, label }) => {
    const filled = cis.filter((ci) => {
      return hasCompletenessValue(ci[key])
    }).length
    return {
      field: label,
      pct: total === 0 ? 0 : Math.round((filled / total) * 100),
    }
  })

  const byCategory = new Map<string, number>()
  const bySeverity = new Map<string, number>()
  for (const f of findings) {
    byCategory.set(f.category, (byCategory.get(f.category) ?? 0) + 1)
    bySeverity.set(f.severity, (bySeverity.get(f.severity) ?? 0) + 1)
  }

  const byClass = new Map<string, number>()
  for (const ci of cis) {
    byClass.set(ci.ciClass, (byClass.get(ci.ciClass) ?? 0) + 1)
  }

  const cisWithGaps = new Set(findings.map((f) => f.ciId)).size

  // Deduplication story (beat 6 close): the agents' job is one CI per real
  // asset. Redundant = duplicate records beyond one survivor per cluster.
  const dupClusterRecords = clusters.reduce(
    (sum, c) => sum + (Array.isArray(c.ciIds) ? c.ciIds.length : 0),
    0
  )
  const redundantRecords = Math.max(0, dupClusterRecords - clusters.length)
  const duplicateReduction = {
    totalCis: total,
    clusters: clusters.length,
    redundantRecords,
    uniqueCis: total - redundantRecords,
    resolvedClusters: clusters.filter((c) => c.status === "approved").length,
  }

  return {
    kpis: {
      totalCis: total,
      openFindings: findings.filter((f) => f.status === "open").length,
      cisWithGaps,
      dupClusters: clusters.length,
      pendingClusters: clusters.filter((c) => c.status === "pending").length,
      pendingRules: rules.filter((r) => r.status === "pending").length,
      pendingTopologies: topologies.filter((t) => t.status === "pending").length,
      queuedRemediations: remediations.filter((r) => r.status === "queued").length,
    },
    completeness,
    findingsByCategory: Array.from(byCategory.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    findingsBySeverity: Array.from(bySeverity.entries()).map(([severity, count]) => ({
      severity,
      count,
    })),
    classDistribution: Array.from(byClass.entries())
      .map(([ciClass, count]) => ({ ciClass, count }))
      .sort((a, b) => b.count - a.count),
    recentRuns: runs.slice(0, 6),
    runCompleteness,
    duplicateReduction,
  }
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>
