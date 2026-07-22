import type { StagingCi } from "@/lib/db/schema"

export const COMPLETENESS_FIELDS = [
  { key: "owner", label: "Owner" },
  { key: "supportGroup", label: "Support group" },
  { key: "serialNumber", label: "Serial" },
  { key: "ipAddress", label: "IP address" },
  { key: "environment", label: "Environment" },
  { key: "lifecycleStatus", label: "Lifecycle" },
  { key: "os", label: "OS" },
  { key: "location", label: "Location" },
] as const

export function hasCompletenessValue(value: unknown) {
  return value !== null && value !== undefined && value !== ""
}

export function isCiComplete(ci: StagingCi) {
  return COMPLETENESS_FIELDS.every(({ key }) => hasCompletenessValue(ci[key]))
}

export function calculateCompletenessByClass(cis: StagingCi[]) {
  const classes = new Map<string, { totalCount: number; completeCount: number }>()

  for (const ci of cis) {
    const counts = classes.get(ci.ciClass) ?? { totalCount: 0, completeCount: 0 }
    counts.totalCount += 1
    if (isCiComplete(ci)) counts.completeCount += 1
    classes.set(ci.ciClass, counts)
  }

  return Array.from(classes.entries())
    .map(([ciClass, counts]) => ({
      ciClass,
      ...counts,
      completenessPercent:
        counts.totalCount === 0
          ? 0
          : Math.round((counts.completeCount / counts.totalCount) * 100),
    }))
    .sort((a, b) => a.ciClass.localeCompare(b.ciClass))
}
