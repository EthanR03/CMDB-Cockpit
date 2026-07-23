# Demo assets

Everything needed to run — and re-run — the CMDB Cockpit live demo cleanly.

| File | What it is |
|---|---|
| `reset-demo.sh` | One-command reset between rehearsals — puts the app back to its **empty** starting state and cleans demo-created identifiers off the ServiceNow instance. |
| `clean-instance.mjs` | Instance-cleanup helper (called by `reset-demo.sh`; reads creds from `../.env.local`). |
| `golden-demo-db.sql` | Optional full snapshot of a *pre-run* (already populated) DB — only if you'd rather present without running the pipeline live. Not used by the reset. |

## Reset between every rehearsal

```bash
./demo/reset-demo.sh
```

It does two things:

1. **Re-seeds the local DB to empty.** Reloads the 113-CI staging bundle and clears all
   agent output — findings, clusters, rules, topologies, remediations, decisions, agent
   runs. The dashboard shows 113 staged CIs and nothing else, so you can **run the pipeline
   live** and watch it populate. The dev server can stay running.
2. **Cleans the ServiceNow instance.** Deletes the identifiers you created during the run
   (Windows Server / Server / Network Gear) so the "create a rule live" beat works again.
   **Keeps the Linux Server identifier** — beat 5's IRE match needs it active.

Scoped staging rows are left alone on purpose (harmless clutter, and the seed data lives
in that table).

## The two demo styles

- **Run the pipeline live** (what `reset-demo.sh` sets up): start empty, click *Run agent
  pipeline* on stage (~1 min on OpenAI), then review and promote.
- **Pre-run** (safer, no live API dependency): load the populated snapshot instead —
  `psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" && psql "$DATABASE_URL" < demo/golden-demo-db.sql` —
  and present the already-swept data.

## Requirements

- `node`, `psql`/`pg_dump` on PATH, Postgres running, `DATABASE_URL` set
  (defaults to `postgresql://localhost:5432/cmdb_cockpit`).
- `../.env.local` with the `SERVICENOW_*` vars and `SERVICENOW_ENABLED=true` for the instance
  cleanup (if it's `false`, only the DB is reset and the instance step is skipped).
