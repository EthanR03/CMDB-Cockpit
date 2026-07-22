import { sql } from "drizzle-orm"
import {
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const stagingCi = pgTable("staging_ci", {
  id: serial("id").primaryKey(),
  teamTag: text("team_tag").notNull().default("hackathon"),
  source: text("source").notNull().default("seed_bundle"),
  ciClass: text("ci_class").notNull(),
  name: text("name").notNull(),
  serialNumber: text("serial_number"),
  macAddress: text("mac_address"),
  ipAddress: text("ip_address"),
  fqdn: text("fqdn"),
  port: integer("port"),
  url: text("url"),
  owner: text("owner"),
  supportGroup: text("support_group"),
  environment: text("environment"),
  lifecycleStatus: text("lifecycle_status"),
  os: text("os"),
  model: text("model"),
  location: text("location"),
  lastDiscovered: timestamp("last_discovered", { withTimezone: true }),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const finding = pgTable("finding", {
  id: serial("id").primaryKey(),
  teamTag: text("team_tag").notNull().default("hackathon"),
  ciId: integer("ci_id").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull().default("medium"),
  field: text("field"),
  message: text("message").notNull(),
  agent: text("agent").notNull().default("profiler"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const dupCluster = pgTable("dup_cluster", {
  id: serial("id").primaryKey(),
  teamTag: text("team_tag").notNull().default("hackathon"),
  clusterKey: text("cluster_key").notNull(),
  ciIds: jsonb("ci_ids").$type<number[]>().notNull(),
  survivorId: integer("survivor_id"),
  confidence: numeric("confidence"),
  rationale: text("rationale"),
  evidence: jsonb("evidence"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const ireRuleProposal = pgTable("ire_rule_proposal", {
  id: serial("id").primaryKey(),
  teamTag: text("team_tag").notNull().default("hackathon"),
  ciClass: text("ci_class").notNull(),
  ruleName: text("rule_name").notNull(),
  criteria: jsonb("criteria").notNull(),
  coverage: jsonb("coverage"),
  rationale: text("rationale"),
  status: text("status").notNull().default("pending"),
  // ServiceNow sync outcome — null until an approval attempts creation
  snSyncStatus: text("sn_sync_status"),
  snSyncError: text("sn_sync_error"),
  snIdentifierSysId: text("sn_identifier_sys_id"),
  snEntrySysIds: jsonb("sn_entry_sys_ids").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const topologyProposal = pgTable("topology_proposal", {
  id: serial("id").primaryKey(),
  teamTag: text("team_tag").notNull().default("hackathon"),
  serviceName: text("service_name").notNull(),
  memberCiIds: jsonb("member_ci_ids").$type<number[]>().notNull(),
  relationships: jsonb("relationships"),
  endpoints: jsonb("endpoints"),
  rationale: text("rationale"),
  confidence: numeric("confidence"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const remediation = pgTable("remediation", {
  id: serial("id").primaryKey(),
  teamTag: text("team_tag").notNull().default("hackathon"),
  actionType: text("action_type").notNull(),
  targetCiId: integer("target_ci_id"),
  payload: jsonb("payload"),
  status: text("status").notNull().default("queued"),
  rollback: jsonb("rollback"),
  // ServiceNow promotion outcome — null when applied with the bridge disabled
  snPromotionStatus: text("sn_promotion_status"),
  snResult: jsonb("sn_result"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
})

export const decision = pgTable("decision", {
  id: serial("id").primaryKey(),
  teamTag: text("team_tag").notNull().default("hackathon"),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  decision: text("decision").notNull(),
  decidedBy: text("decided_by").notNull().default("reviewer"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const agentRun = pgTable("agent_run", {
  id: serial("id").primaryKey(),
  teamTag: text("team_tag").notNull().default("hackathon"),
  agent: text("agent").notNull(),
  status: text("status").notNull().default("running"),
  summary: text("summary"),
  stats: jsonb("stats"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
})

export const agentRunCompletenessSnapshot = pgTable(
  "agent_run_completeness_snapshot",
  {
    id: serial("id").primaryKey(),
    agentRunId: integer("agent_run_id")
      .notNull()
      .references(() => agentRun.id, { onDelete: "cascade" }),
    teamTag: text("team_tag").notNull().default("hackathon"),
    ciClass: text("ci_class").notNull(),
    phase: text("phase").notNull(),
    totalCount: integer("total_count").notNull(),
    completeCount: integer("complete_count").notNull(),
    completenessPercent: integer("completeness_percent").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("agent_run_completeness_snapshot_run_class_phase_uidx").on(
      table.agentRunId,
      table.ciClass,
      table.phase
    ),
    check(
      "agent_run_completeness_snapshot_phase_check",
      sql`${table.phase} in ('before', 'after')`
    ),
    check(
      "agent_run_completeness_snapshot_counts_check",
      sql`${table.totalCount} >= 0 and ${table.completeCount} >= 0 and ${table.completeCount} <= ${table.totalCount}`
    ),
    check(
      "agent_run_completeness_snapshot_percent_check",
      sql`${table.completenessPercent} between 0 and 100`
    ),
  ]
)

export type StagingCi = typeof stagingCi.$inferSelect
export type Finding = typeof finding.$inferSelect
export type DupCluster = typeof dupCluster.$inferSelect
export type IreRuleProposal = typeof ireRuleProposal.$inferSelect
export type TopologyProposal = typeof topologyProposal.$inferSelect
export type Remediation = typeof remediation.$inferSelect
export type Decision = typeof decision.$inferSelect
export type AgentRun = typeof agentRun.$inferSelect
export type AgentRunCompletenessSnapshot = typeof agentRunCompletenessSnapshot.$inferSelect
