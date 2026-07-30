# CMDB Cockpit

**Agent-assisted CMDB intake.** A messy discovery bundle goes in; clean, human-approved
configuration items come out — promoted into ServiceNow through its own **Identification &
Reconciliation Engine (IRE)**, so the CMDB gets one CI per real asset instead of another duplicate.

Built for the KeenStack **StackUp 2026** hackathon (AI × ServiceNow). This is a concept
prototype on a ServiceNow developer instance — not a ServiceNow product.

---

## The problem

Discovery, imports, and manual entry flood a CMDB with duplicate, incomplete, and stale
records. Reconciling them by hand is slow and error-prone — and a CMDB nobody trusts breaks
change management, impact analysis, and audits.

## The idea

Four AI agents sweep a staged intake bundle and **propose** fixes. A human **approves** each
proposal. A scoped bridge then **promotes** the approved work into ServiceNow — creating
identification rules and running CIs through IRE — so identity is matched, not duplicated.

> We don't bypass the CMDB — we teach intake to use its front door.
> AI proposes, a human decides, and IRE matches instead of creating duplicates.

## How it works

```
messy intake ──► Postgres staging ──► 4 AI agents propose ──► human approves ──► ServiceNow
 (seed bundle)                        (OpenAI + AI SDK)      (Next.js cockpit)   (rules + IRE)
```

The four agents (`lib/agents/`):

| Agent | Role |
|---|---|
| **Profiler** | Sweeps staging and files every gap finding with a severity |
| **Identity** | Detects duplicate CI clusters with field-level evidence and picks a survivor |
| **Rulewright** | Authors IRE identification rules from measured field coverage |
| **Cartographer** | Proposes service topology and endpoints |

Approvals are Next.js **server actions** (`app/actions/review.ts`). On approve, a **safe
executor** applies merges locally (with a rollback snapshot written first), and the
**ServiceNow bridge** (`lib/servicenow.ts`) creates the identification rule and promotes the CI
through `identifyreconcile`.

## The ServiceNow bridge (`lib/servicenow.ts`)

A from-scratch basic-auth Table API wrapper + `identifyreconcile`, hardened for a shared instance:

- **Scoping is enforced in the module, never by callers** — a team-identifier filter on every
  query and a write-target allowlist.
- **Error taxonomy** — `auth` / `acl` / `conflict` / `timeout` / `bad_payload`, surfaced on the
  exact UI card it affects; a failed write never unwinds the local decision.
- **Idempotent rule creation** — checks whether an identifier already exists for a CI class
  before inserting, so a duplicate is reported gracefully instead of erroring.
- **Enable-flag gated** (`SERVICENOW_ENABLED`) — the whole app demos with no instance attached.

## Tech stack

Next.js 16 (App Router, RSC, server actions) · TypeScript · Postgres + Drizzle ORM ·
Vercel AI SDK on OpenAI (`gpt-4o-mini`) · Zod-validated structured output · Tailwind + shadcn/ui ·
ServiceNow Table API + Identification & Reconciliation Engine.

## Getting started

**Prerequisites:** Node 20+, pnpm, a local Postgres. ServiceNow is optional (the app runs fully
without it).

```bash
pnpm install

# 1. Configure — copy the template and fill in your own values
cp .env.example .env.local        # then edit .env.local

# 2. Create the schema and seed the messy intake bundle (~113 CIs)
pnpm drizzle-kit push
node scripts/seed.mjs

# 3. Run
pnpm dev                          # http://localhost:3000
```

Then click **Run agent pipeline** on the dashboard to let the agents populate findings,
duplicate clusters, identification rules, and service maps.

### Environment

`.env.local` (server-side only — never commit real values):

```bash
DATABASE_URL=postgresql://localhost:5432/cmdb_cockpit
OPENAI_API_KEY=sk-...

# ServiceNow bridge — leave ENABLED=false to run without an instance
SERVICENOW_ENABLED=false
SERVICENOW_INSTANCE_URL=https://devXXXXX.service-now.com
SERVICENOW_USER=
SERVICENOW_PASSWORD=
SERVICENOW_TEAM_IDENTIFIER=your_team_tag
SERVICENOW_STAGING_TABLE=x_your_scoped_staging_ci
SERVICENOW_TEAM_FIELD=u_team_tag
SERVICENOW_DATA_SOURCE=Manual via AI Agent   # a registered cmdb_ci.discovery_source choice
```

## Project structure

```
app/            Next.js routes + server actions (review/approval flow)
components/     the cockpit UI (dashboard, duplicates, rules, remediation, audit)
lib/agents/     the four AI agents + shared model config
lib/servicenow.ts   the ServiceNow bridge (Table API + identifyreconcile)
lib/remediation/    safe merge/rollback executor
lib/db/         Drizzle schema + queries
scripts/seed.mjs    synthetic messy CMDB bundle
demo/           demo reset tooling (see demo/README.md)
```

## Team

A three-intern KeenStack project — webapp & ServiceNow integration, AI agents, and the
ServiceNow instance/scoped app.

---

*Concept pitch on a ServiceNow developer instance. "Service-mapping analysis" refers to our own
topology proposals, not ServiceNow Service Mapping™.*
