// Remove demo-created identifiers from the ServiceNow instance so the
// "create a rule live" beat works again on the next rehearsal.
//
// Deletes team-prefixed cmdb_identifier records (and their entries) for the
// create-classes, but KEEPS the Linux Server identifier — beat 5's IRE match
// depends on it staying active. Scoped staging rows are left alone (they're
// harmless clutter, and Jade's seed lives in that table).
//
// Reads ServiceNow creds from ../.env.local. Safe to run repeatedly.
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const env = {}
for (const line of readFileSync(join(here, "..", ".env.local"), "utf8").split("\n")) {
  const t = line.trim()
  if (t && !t.startsWith("#") && t.includes("=")) {
    const i = t.indexOf("=")
    env[t.slice(0, i)] = t.slice(i + 1)
  }
}

if (env.SERVICENOW_ENABLED !== "true") {
  console.log("  SERVICENOW_ENABLED is not true — skipping instance cleanup.")
  process.exit(0)
}

const base = env.SERVICENOW_INSTANCE_URL.replace(/\/+$/, "")
const auth = Buffer.from(`${env.SERVICENOW_USER}:${env.SERVICENOW_PASSWORD}`).toString("base64")
const tag = env.SERVICENOW_TEAM_IDENTIFIER
const H = { Authorization: `Basic ${auth}`, Accept: "application/json" }

// team-prefixed identifiers, excluding the Linux Server match target
const q = `nameSTARTSWITH${tag}^applies_to!=cmdb_ci_linux_server`
const res = await fetch(
  `${base}/api/now/table/cmdb_identifier?sysparm_query=${encodeURIComponent(q)}&sysparm_fields=sys_id,name,applies_to&sysparm_limit=100`,
  { headers: H }
)
if (!res.ok) {
  console.error(`  cmdb_identifier query failed: HTTP ${res.status}`)
  process.exit(1)
}
const ids = (await res.json()).result
if (ids.length === 0) {
  console.log("  no demo-created identifiers to remove (Linux match target preserved).")
  process.exit(0)
}

for (const id of ids) {
  const er = await fetch(
    `${base}/api/now/table/cmdb_identifier_entry?sysparm_query=identifier=${id.sys_id}&sysparm_fields=sys_id`,
    { headers: H }
  )
  const entries = er.ok ? (await er.json()).result : []
  for (const e of entries) {
    await fetch(`${base}/api/now/table/cmdb_identifier_entry/${e.sys_id}`, { method: "DELETE", headers: H })
  }
  const del = await fetch(`${base}/api/now/table/cmdb_identifier/${id.sys_id}`, { method: "DELETE", headers: H })
  console.log(`  removed ${id.name} (${id.applies_to}) + ${entries.length} entr${entries.length === 1 ? "y" : "ies"} [${del.status}]`)
}
console.log(`  ${ids.length} demo identifier(s) cleaned.`)
