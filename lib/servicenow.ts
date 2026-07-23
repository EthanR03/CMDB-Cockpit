import "server-only"

/**
 * ServiceNow bridge: basic-auth Table API wrapper + identifyreconcile.
 *
 * Scoping is enforced HERE, never by callers:
 * - every read query gets the team-identifier filter appended
 * - writes are only allowed into identification-rule tables or scoped-app
 *   (x_*) tables, and every written row is stamped with the team identifier
 */

export type ServiceNowErrorKind =
  | "auth"
  | "acl"
  | "conflict"
  | "timeout"
  | "bad_payload"
  | "scope"
  | "network"
  | "config"

export class ServiceNowError extends Error {
  kind: ServiceNowErrorKind
  status?: number
  detail?: string

  constructor(
    kind: ServiceNowErrorKind,
    message: string,
    opts?: { status?: number; detail?: string }
  ) {
    super(message)
    this.name = "ServiceNowError"
    this.kind = kind
    this.status = opts?.status
    this.detail = opts?.detail
  }
}

/** Short human-readable form stored on rows and shown in the UI. */
export function describeServiceNowError(err: unknown): string {
  if (err instanceof ServiceNowError) return `${err.kind}: ${err.message}`
  if (err instanceof Error) return err.message
  return String(err)
}

const REQUEST_TIMEOUT_MS = 15_000
const MAX_DETAIL_CHARS = 500

export function isServiceNowEnabled(): boolean {
  return process.env.SERVICENOW_ENABLED === "true"
}

type SnConfig = {
  instanceUrl: string
  user: string
  password: string
  teamTag: string
  stagingTable: string
  teamField: string
  dataSource: string | null
}

function getConfig(): SnConfig {
  const instanceUrl = process.env.SERVICENOW_INSTANCE_URL?.replace(/\/+$/, "")
  const user = process.env.SERVICENOW_USER
  const password = process.env.SERVICENOW_PASSWORD
  const teamTag = process.env.SERVICENOW_TEAM_IDENTIFIER
  if (!instanceUrl || !user || !password || !teamTag) {
    throw new ServiceNowError(
      "config",
      "ServiceNow env incomplete: set SERVICENOW_INSTANCE_URL, SERVICENOW_USER, SERVICENOW_PASSWORD, SERVICENOW_TEAM_IDENTIFIER in .env.local"
    )
  }
  return {
    instanceUrl,
    user,
    password,
    teamTag,
    stagingTable: process.env.SERVICENOW_STAGING_TABLE ?? "x_cockpit_staging_ci",
    teamField: process.env.SERVICENOW_TEAM_FIELD ?? "u_team_tag",
    dataSource: process.env.SERVICENOW_DATA_SOURCE ?? null,
  }
}

// ---------------------------------------------------------------------------
// Scoping rules
// ---------------------------------------------------------------------------

const IDENTIFIER_TABLES = new Set(["cmdb_identifier", "cmdb_identifier_entry"])

function assertWritableTable(table: string) {
  if (IDENTIFIER_TABLES.has(table) || table.startsWith("x_")) return
  throw new ServiceNowError(
    "scope",
    `Refusing write to "${table}": only cmdb_identifier, cmdb_identifier_entry, and scoped-app (x_*) tables are writable from this app`
  )
}

/** Encoded-query clause restricting reads on `table` to team-owned rows. */
function teamScopeClause(cfg: SnConfig, table: string): string {
  if (table.startsWith("x_")) return `${cfg.teamField}=${cfg.teamTag}`
  // Identification rules ARE name-prefixed with the team tag when we create them.
  if (table === "cmdb_identifier") return `nameSTARTSWITH${cfg.teamTag}`
  if (table === "cmdb_identifier_entry") return `identifier.nameSTARTSWITH${cfg.teamTag}`
  // Shared CMDB CI classes (cmdb_ci_*): promoted CIs keep their real names and
  // are marked by discovery_source, not a name prefix (team decision). Scope
  // read-backs by the data source so they don't come back empty.
  if (cfg.dataSource) return `discovery_source=${cfg.dataSource}`
  return `nameSTARTSWITH${cfg.teamTag}`
}

/** Stamp the team identifier onto a row before it is written. */
function applyTeamStamp(
  cfg: SnConfig,
  table: string,
  fields: Record<string, unknown>
): Record<string, unknown> {
  if (table.startsWith("x_")) return { ...fields, [cfg.teamField]: cfg.teamTag }
  if (typeof fields.name === "string" && !fields.name.startsWith(cfg.teamTag)) {
    return { ...fields, name: `${cfg.teamTag}_${fields.name}` }
  }
  return fields
}

// ---------------------------------------------------------------------------
// Core fetch
// ---------------------------------------------------------------------------

function classifyHttpError(status: number, path: string, detail: string): ServiceNowError {
  const opts = { status, detail: detail.slice(0, MAX_DETAIL_CHARS) }
  if (status === 401)
    return new ServiceNowError("auth", "ServiceNow rejected the credentials (401) — check SERVICENOW_USER / SERVICENOW_PASSWORD", opts)
  if (status === 403) {
    // A 403 on a write is often NOT an ACL denial but a validation/uniqueness
    // rejection — e.g. "Error during insert of cmdb_identifier" when an
    // identifier already exists for the class. Don't mislabel it as permissions.
    if (/error during insert|operation failed|already exists|duplicate/i.test(detail))
      return new ServiceNowError("conflict", `ServiceNow rejected the write to ${path} (403) — likely a duplicate or validation conflict`, opts)
    return new ServiceNowError("acl", `Service account lacks ACL for ${path} (403)`, opts)
  }
  if (status === 400 || status === 404 || status === 413 || status === 422)
    return new ServiceNowError("bad_payload", `ServiceNow rejected the request to ${path} (${status})`, opts)
  return new ServiceNowError("network", `ServiceNow returned ${status} for ${path}`, opts)
}

async function snFetch<T>(
  path: string,
  init: { method: "GET" | "POST" | "PATCH"; body?: unknown }
): Promise<T> {
  const cfg = getConfig()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${cfg.instanceUrl}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.user}:${cfg.password}`).toString("base64")}`,
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    })
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ServiceNowError("timeout", `ServiceNow request timed out after ${REQUEST_TIMEOUT_MS / 1000}s: ${path}`)
    }
    throw new ServiceNowError("network", `Could not reach ServiceNow instance: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw classifyHttpError(res.status, path, detail)
  }

  try {
    return (await res.json()) as T
  } catch {
    throw new ServiceNowError("bad_payload", `ServiceNow returned non-JSON for ${path}`, { status: res.status })
  }
}

// ---------------------------------------------------------------------------
// Table API
// ---------------------------------------------------------------------------

export type SnRecord = { sys_id: string } & Record<string, unknown>

export async function snQuery(
  table: string,
  query = "",
  opts?: { fields?: string[]; limit?: number }
): Promise<SnRecord[]> {
  const cfg = getConfig()
  const scoped = query ? `${query}^${teamScopeClause(cfg, table)}` : teamScopeClause(cfg, table)
  const params = new URLSearchParams({
    sysparm_query: scoped,
    sysparm_limit: String(opts?.limit ?? 100),
    sysparm_display_value: "false",
    sysparm_exclude_reference_link: "true",
  })
  if (opts?.fields?.length) params.set("sysparm_fields", opts.fields.join(","))
  const data = await snFetch<{ result: SnRecord[] }>(
    `/api/now/table/${table}?${params}`,
    { method: "GET" }
  )
  return data.result
}

export async function snInsert(
  table: string,
  fields: Record<string, unknown>
): Promise<SnRecord> {
  assertWritableTable(table)
  const cfg = getConfig()
  const data = await snFetch<{ result: SnRecord }>(
    `/api/now/table/${table}?sysparm_exclude_reference_link=true`,
    { method: "POST", body: applyTeamStamp(cfg, table, fields) }
  )
  return data.result
}

// ---------------------------------------------------------------------------
// High-level operations used by the review actions
// ---------------------------------------------------------------------------

export type IreCriteriaEntry = {
  priority: number
  attributes: string[]
  allowNull?: boolean
}

/**
 * Find an existing identifier for a CI class. ServiceNow allows ~one identifier
 * per class (a second INSERT is rejected with a 403 "Error during insert"), and
 * out-of-box identifiers are NOT team-prefixed — so this read intentionally looks
 * past the team scope to see the global constraint the caller must respect.
 */
async function findIdentifierForClass(ciClass: string): Promise<SnRecord | null> {
  const params = new URLSearchParams({
    sysparm_query: `applies_to=${ciClass}`,
    sysparm_limit: "1",
    sysparm_fields: "sys_id,name,applies_to",
    sysparm_exclude_reference_link: "true",
  })
  const data = await snFetch<{ result: SnRecord[] }>(
    `/api/now/table/cmdb_identifier?${params}`,
    { method: "GET" }
  )
  return data.result[0] ?? null
}

export type IdentificationRuleResult = {
  status: "created" | "exists"
  identifierSysId: string
  identifierName: string | null
  entrySysIds: string[]
}

/**
 * Ensure a cmdb_identifier exists for the class. Checks first: if the class
 * already has one (ours from a prior run, or an out-of-box rule), report it
 * instead of blind-inserting a duplicate (which ServiceNow 403s). Otherwise
 * create the identifier plus one cmdb_identifier_entry per criteria row.
 */
export async function snCreateIdentificationRule(input: {
  ciClass: string
  ruleName: string
  criteria: IreCriteriaEntry[]
  rationale?: string | null
}): Promise<IdentificationRuleResult> {
  if (!input.criteria.length) {
    throw new ServiceNowError("bad_payload", "Rule proposal has no criteria entries")
  }

  const existing = await findIdentifierForClass(input.ciClass)
  if (existing) {
    return {
      status: "exists",
      identifierSysId: existing.sys_id,
      identifierName: typeof existing.name === "string" ? existing.name : null,
      entrySysIds: [],
    }
  }

  const identifier = await snInsert("cmdb_identifier", {
    name: input.ruleName,
    applies_to: input.ciClass,
    active: "true",
    description: input.rationale ?? "Created by CMDB Cockpit (Rulewright proposal, human-approved)",
  })

  const entrySysIds: string[] = []
  for (const entry of input.criteria) {
    const created = await snInsert("cmdb_identifier_entry", {
      identifier: identifier.sys_id,
      criterion_attributes: entry.attributes.join(","),
      priority: String(entry.priority * 100),
      active: "true",
      allow_null_attribute: entry.allowNull ? "true" : "false",
    })
    entrySysIds.push(created.sys_id)
  }

  return {
    status: "created",
    identifierSysId: identifier.sys_id,
    identifierName: typeof identifier.name === "string" ? identifier.name : input.ruleName,
    entrySysIds,
  }
}

/** Insert one CI row into the scoped-app staging table. */
export async function snStageCi(fields: Record<string, unknown>): Promise<{
  sysId: string
  table: string
}> {
  const cfg = getConfig()
  const record = await snInsert(cfg.stagingTable, fields)
  return { sysId: record.sys_id, table: cfg.stagingTable }
}

export type IdentifyReconcileItem = {
  className: string
  values: Record<string, unknown>
}

/**
 * POST /api/now/identifyreconcile — runs the CI through IRE so an approved
 * identification rule can match it instead of creating a duplicate.
 */
export async function snIdentifyReconcile(
  items: IdentifyReconcileItem[]
): Promise<unknown> {
  const cfg = getConfig()
  // sysparm_data_source must be a registered choice on cmdb_ci.discovery_source —
  // arbitrary values are rejected with INVALID_INPUT_DATA. Omit unless configured.
  const params = new URLSearchParams()
  if (cfg.dataSource) params.set("sysparm_data_source", cfg.dataSource)
  const data = await snFetch<{ result: unknown }>(
    `/api/now/identifyreconcile${params.size > 0 ? `?${params}` : ""}`,
    {
      method: "POST",
      body: {
        items: items.map((item) => ({
          className: item.className,
          values: item.values,
        })),
      },
    }
  )
  return data.result
}
