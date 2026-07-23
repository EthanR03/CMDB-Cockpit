# Demo assets

Everything needed to run — and re-run — the CMDB Cockpit live demo cleanly.

| File | What it is |
|---|---|
| `golden-demo-db.sql` | `pg_dump` of the pristine demo DB: 113 staged CIs, agent findings/clusters/rules/topologies, **nothing approved**, empty remediation queue. The exact state the demo should start from. |
| `reset-demo.sh` | One-command reset between rehearsals — restores the golden DB and cleans demo-created identifiers off the ServiceNow instance. |
| `clean-instance.mjs` | Instance-cleanup helper (called by `reset-demo.sh`; reads creds from `../.env.local`). |

## Reset between every rehearsal

```bash
./demo/reset-demo.sh
```

It does two things:

1. **Local DB → golden.** Clusters and rules back to pending, queue empty, any merged
   CIs restored. The dev server can stay running (Next.js reconnects).
2. **ServiceNow → clean.** Deletes the identifiers you created during the run
   (Windows Server / Server / Network Gear) so the "create a rule live" beat works again.
   **Keeps the Linux Server identifier** — beat 5's IRE match needs it active.

Scoped staging rows are left alone on purpose (harmless clutter, and the seed data lives
in that table).

## Refreshing the golden snapshot

Only if you deliberately regenerate the dataset (e.g., re-run the pipeline and want to keep
the new proposals):

```bash
pg_dump "$DATABASE_URL" > demo/golden-demo-db.sql
```

Do this from a clean, nothing-approved state — that's what every reset will restore to.

## Requirements

- `psql` / `pg_dump` on PATH, `DATABASE_URL` set (defaults to `postgresql://localhost:5432/cmdb_cockpit`).
- `../.env.local` with the `SERVICENOW_*` vars and `SERVICENOW_ENABLED=true` for the instance
  cleanup (if it's `false`, the instance step is skipped and only the DB is restored).
