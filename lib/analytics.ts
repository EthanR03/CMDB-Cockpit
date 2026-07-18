import "server-only"

import {
  getAgentRuns,
  getDupClusters,
  getFindings,
  getIreRuleProposals,
  getRemediations,
  getStagingCis,
  getTopologyProposals,
} from "@/lib/queries"

const COMPLETENESS_FIELDS = [
  { key: "owner", label: "Owner" },
  { key: "supportGroup", label: "Support group" },
  { key: "serialNumber", label: "Serial" },
  { key: "ipAddress", label: "IP address" },
  { key: "environment", label: "Environment" },
  { key: "lifecycleStatus", label: "Lifecycle" },
  { key: "os", label: "OS" },
  { key: "location", label: "Location" },
] as const

export async function getDashboardData() {
  const [cis, findings, clusters, rules, topologies, remediations, runs] =
    await Promise.all([
      getStagingCis(),
      getFindings(),
      getDupClusters(),
      getIreRuleProposals(),
      getTopologyProposals(),
      getRemediations(),
      getAgentRuns(),
    ])

  const total = cis.length

  const completeness = COMPLETENESS_FIELDS.map(({ key, label }) => {
    const filled = cis.filter((ci) => {
      const v = ci[key]
      return v !== null && v !== undefined && v !== ""
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
  }
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>
