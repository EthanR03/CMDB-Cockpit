export const TEAM_TAG = "hackathon"

export const CI_CLASS_LABELS: Record<string, string> = {
  cmdb_ci_linux_server: "Linux Server",
  cmdb_ci_win_server: "Windows Server",
  cmdb_ci_server: "Server",
  cmdb_ci_db_instance: "DB Instance",
  cmdb_ci_appl: "Application",
  cmdb_ci_lb: "Load Balancer",
  cmdb_ci_netgear: "Network Gear",
}

export const GAP_CATEGORIES: Record<string, { label: string; description: string }> = {
  missing_owner: { label: "Missing owner", description: "No assigned owner or support group" },
  missing_identifier: { label: "Missing identifier", description: "No serial, MAC, or IP to identify the CI" },
  inconsistent_naming: { label: "Naming", description: "Name violates dominant convention" },
  stale_record: { label: "Stale", description: "Not discovered recently" },
  lifecycle_mismatch: { label: "Lifecycle", description: "Lifecycle state contradicts evidence" },
  orphaned: { label: "Orphaned", description: "No relationships to any other CI" },
  class_misassignment: { label: "Class", description: "Attributes suggest a different CI class" },
  data_quality: { label: "Data quality", description: "Malformed or non-normalized field values" },
}

export const SEVERITY_ORDER = ["critical", "high", "medium", "low"] as const
export type Severity = (typeof SEVERITY_ORDER)[number]

export const AGENTS = [
  { id: "profiler", name: "Profiler", role: "Sweeps staging and files every gap finding" },
  { id: "identity", name: "Identity", role: "Detects duplicate CI clusters with evidence" },
  { id: "rulewright", name: "Rulewright", role: "Authors IRE identification rules from field coverage" },
  { id: "cartographer", name: "Cartographer", role: "Proposes service topology and endpoints" },
] as const
export type AgentId = (typeof AGENTS)[number]["id"]
