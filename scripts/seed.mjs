// Synthetic messy CMDB seed bundle (~120 CIs) — Intake agent equivalent.
// Deliberately includes: missing owners/support groups, missing serials/IPs,
// duplicate clusters, stale records, wrong lifecycle states, inconsistent
// naming, orphaned CIs, and endpoint signal (ip/port/url) for Cartographer.
import pg from "pg"

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const TEAM = "hackathon"

const owners = ["a.okafor", "m.reyes", "j.tanaka", "s.novak", "p.gupta", "l.dubois"]
const groups = ["Unix-Ops", "Windows-Ops", "DBA-Team", "Net-Ops", "App-Support"]
const locations = ["DC-EAST-1", "DC-WEST-2", "AWS us-east-1", "Azure eastus", "COLO-NJ"]

// seeded PRNG for reproducibility
let s = 42
const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const maybe = (p, v) => (rnd() < p ? v : null)
const serial = () => "SN" + Math.floor(rnd() * 9e7 + 1e7)
const mac = () =>
  Array.from({ length: 6 }, () =>
    Math.floor(rnd() * 256).toString(16).padStart(2, "0")
  ).join(":").toUpperCase()
const ip = (sub) => `10.${sub}.${Math.floor(rnd() * 254) + 1}.${Math.floor(rnd() * 254) + 1}`
const daysAgo = (d) => new Date(Date.now() - d * 86400000)

const rows = []
const add = (r) => rows.push({ team_tag: TEAM, source: "seed_bundle", ...r })

// ---- Application services (3 services worth of topology signal) ----
const services = [
  { key: "payments", app: "Payments Portal", sub: 10, domain: "payments.corp.example" },
  { key: "hrportal", app: "HR Self-Service", sub: 20, domain: "hr.corp.example" },
  { key: "inventory", app: "Inventory API", sub: 30, domain: "inventory.corp.example" },
]

for (const svc of services) {
  // load balancer
  add({
    ci_class: "cmdb_ci_lb",
    name: `${svc.key}-lb-01`,
    ip_address: ip(svc.sub),
    fqdn: svc.domain,
    port: 443,
    url: `https://${svc.domain}`,
    owner: maybe(0.7, pick(owners)),
    support_group: "Net-Ops",
    environment: "production",
    lifecycle_status: "operational",
    model: "F5 BIG-IP 4200v",
    serial_number: serial(),
    location: pick(locations),
    last_discovered: daysAgo(Math.floor(rnd() * 5)),
  })
  // web servers (inconsistent naming styles on purpose)
  const styles = [
    (i) => `${svc.key.toUpperCase()}-WEB-0${i}`,
    (i) => `${svc.key}_web_0${i}`,
    (i) => `${svc.key}web${i}.prod`,
  ]
  for (let i = 1; i <= 3; i++) {
    add({
      ci_class: "cmdb_ci_linux_server",
      name: styles[(i - 1) % styles.length](i),
      serial_number: maybe(0.75, serial()),
      mac_address: maybe(0.8, mac()),
      ip_address: ip(svc.sub),
      fqdn: maybe(0.6, `${svc.key}-web-0${i}.${svc.domain}`),
      port: 8080,
      owner: maybe(0.6, pick(owners)),
      support_group: maybe(0.65, "Unix-Ops"),
      environment: "production",
      lifecycle_status: pick(["operational", "operational", "installed", ""]),
      os: pick(["RHEL 9.3", "Ubuntu 22.04", "rhel9", "Red Hat Enterprise Linux 9"]),
      model: "Dell PowerEdge R650",
      location: pick(locations),
      last_discovered: daysAgo(Math.floor(rnd() * 30)),
    })
  }
  // app servers
  for (let i = 1; i <= 2; i++) {
    add({
      ci_class: "cmdb_ci_appl",
      name: `${svc.app} - node ${i}`,
      ip_address: ip(svc.sub),
      port: 9000 + i,
      url: `https://${svc.domain}/api`,
      owner: maybe(0.5, pick(owners)),
      support_group: maybe(0.5, "App-Support"),
      environment: "production",
      lifecycle_status: "operational",
      last_discovered: daysAgo(Math.floor(rnd() * 14)),
    })
  }
  // database
  add({
    ci_class: "cmdb_ci_db_instance",
    name: `${svc.key}-db-primary`,
    ip_address: ip(svc.sub),
    port: 5432,
    serial_number: maybe(0.5, serial()),
    owner: maybe(0.7, pick(owners)),
    support_group: "DBA-Team",
    environment: "production",
    lifecycle_status: "operational",
    os: "PostgreSQL 16",
    location: pick(locations),
    last_discovered: daysAgo(Math.floor(rnd() * 10)),
  })
}

// ---- General server fleet with heavy messiness (~60) ----
for (let i = 1; i <= 60; i++) {
  const win = rnd() < 0.4
  const stale = rnd() < 0.2
  const retiredButAlive = rnd() < 0.08
  add({
    ci_class: win ? "cmdb_ci_win_server" : "cmdb_ci_linux_server",
    name:
      rnd() < 0.3
        ? `srv-${String(i).padStart(3, "0")}.corp.example`
        : rnd() < 0.5
          ? `SRV-${String(i).padStart(3, "0")}`
          : `srv_${String(i).padStart(3, "0")}`,
    serial_number: maybe(0.7, serial()),
    mac_address: maybe(0.7, mac()),
    ip_address: maybe(0.8, ip(40 + (i % 5))),
    owner: maybe(0.55, pick(owners)),
    support_group: maybe(0.6, win ? "Windows-Ops" : "Unix-Ops"),
    environment: pick(["production", "staging", "dev", "", "PROD"]),
    lifecycle_status: retiredButAlive
      ? "retired"
      : pick(["operational", "operational", "installed", "in_maintenance", ""]),
    os: win
      ? pick(["Windows Server 2022", "Win2019", "Microsoft Windows Server 2019"])
      : pick(["RHEL 8.9", "Ubuntu 20.04", "SLES 15"]),
    model: pick(["Dell PowerEdge R650", "HPE ProLiant DL380", "Lenovo SR630", ""]),
    location: maybe(0.75, pick(locations)),
    last_discovered: retiredButAlive
      ? daysAgo(2)
      : stale
        ? daysAgo(200 + Math.floor(rnd() * 300))
        : daysAgo(Math.floor(rnd() * 45)),
  })
}

// ---- Network gear (~12, some orphaned / no owner) ----
for (let i = 1; i <= 12; i++) {
  add({
    ci_class: "cmdb_ci_netgear",
    name: rnd() < 0.5 ? `sw-core-${i}` : `SW_CORE_${i}`,
    serial_number: maybe(0.85, serial()),
    mac_address: mac(),
    ip_address: ip(1),
    owner: maybe(0.3, pick(owners)),
    support_group: maybe(0.5, "Net-Ops"),
    environment: "production",
    lifecycle_status: pick(["operational", "installed", ""]),
    model: pick(["Cisco Catalyst 9300", "Arista 7050X", "Juniper EX4400"]),
    location: pick(locations),
    last_discovered: daysAgo(Math.floor(rnd() * 60)),
  })
}

// ---- Deliberate duplicate clusters (~10 clusters, ~22 extra rows) ----
// Archetype A: same serial, different name casing/format
for (let i = 1; i <= 4; i++) {
  const sn = serial()
  const theIp = ip(50)
  const theMac = mac()
  add({
    ci_class: "cmdb_ci_linux_server",
    name: `APP-NODE-${i}0`,
    serial_number: sn,
    mac_address: theMac,
    ip_address: theIp,
    owner: pick(owners),
    support_group: "Unix-Ops",
    environment: "production",
    lifecycle_status: "operational",
    os: "RHEL 9.3",
    location: "DC-EAST-1",
    last_discovered: daysAgo(3),
  })
  add({
    ci_class: "cmdb_ci_linux_server",
    name: `app-node-${i}0.corp.example`,
    serial_number: sn,
    mac_address: theMac,
    ip_address: theIp,
    owner: null,
    support_group: null,
    environment: "PROD",
    lifecycle_status: "installed",
    os: "Red Hat Enterprise Linux 9",
    location: null,
    last_discovered: daysAgo(40),
    source: "discovery_import",
  })
}
// Archetype B: same name, missing serial on one
for (let i = 1; i <= 3; i++) {
  const nm = `etl-worker-0${i}`
  const theIp = ip(60)
  add({
    ci_class: "cmdb_ci_server",
    name: nm,
    serial_number: serial(),
    ip_address: theIp,
    owner: pick(owners),
    support_group: "App-Support",
    environment: "production",
    lifecycle_status: "operational",
    last_discovered: daysAgo(5),
  })
  add({
    ci_class: "cmdb_ci_server",
    name: nm.toUpperCase(),
    serial_number: null,
    ip_address: theIp,
    owner: null,
    support_group: null,
    environment: "",
    lifecycle_status: "",
    last_discovered: daysAgo(120),
    source: "spreadsheet_import",
  })
}
// Archetype C: triplet — same MAC across three imports
for (let i = 1; i <= 2; i++) {
  const theMac = mac()
  const sn = serial()
  const variants = [
    { name: `DB-CLUSTER-NODE-${i}`, source: "seed_bundle", owner: pick(owners) },
    { name: `db-cluster-node-${i}`, source: "discovery_import", owner: null },
    { name: `dbclusternode${i}.corp.example`, source: "agent_import", owner: null },
  ]
  for (const v of variants) {
    add({
      ci_class: "cmdb_ci_db_instance",
      name: v.name,
      serial_number: rnd() < 0.6 ? sn : null,
      mac_address: theMac,
      ip_address: ip(70),
      port: 5432,
      owner: v.owner,
      support_group: maybe(0.5, "DBA-Team"),
      environment: "production",
      lifecycle_status: pick(["operational", "installed"]),
      os: "PostgreSQL 15",
      last_discovered: daysAgo(Math.floor(rnd() * 20)),
      source: v.source,
    })
  }
}

console.log(`[v0] Generated ${rows.length} synthetic CIs`)

const client = await pool.connect()
try {
  await client.query("BEGIN")
  await client.query("DELETE FROM finding WHERE team_tag = $1", [TEAM])
  await client.query("DELETE FROM dup_cluster WHERE team_tag = $1", [TEAM])
  await client.query("DELETE FROM ire_rule_proposal WHERE team_tag = $1", [TEAM])
  await client.query("DELETE FROM topology_proposal WHERE team_tag = $1", [TEAM])
  await client.query("DELETE FROM remediation WHERE team_tag = $1", [TEAM])
  await client.query("DELETE FROM decision WHERE team_tag = $1", [TEAM])
  await client.query("DELETE FROM agent_run WHERE team_tag = $1", [TEAM])
  await client.query("DELETE FROM staging_ci WHERE team_tag = $1", [TEAM])

  const cols = [
    "team_tag", "source", "ci_class", "name", "serial_number", "mac_address",
    "ip_address", "fqdn", "port", "url", "owner", "support_group",
    "environment", "lifecycle_status", "os", "model", "location", "last_discovered",
  ]
  for (const r of rows) {
    const vals = cols.map((c) => r[c] ?? null)
    await client.query(
      `INSERT INTO staging_ci (${cols.join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")})`,
      vals
    )
  }
  await client.query("COMMIT")
  console.log(`[v0] Seeded ${rows.length} rows into staging_ci`)
} catch (e) {
  await client.query("ROLLBACK")
  console.error("[v0] Seed failed:", e.message)
  process.exit(1)
} finally {
  client.release()
  await pool.end()
}
