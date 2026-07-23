#!/usr/bin/env bash
#
# reset-demo.sh — restore the CMDB Cockpit demo to its pristine golden state
# between rehearsals (and before the real thing).
#
#   1. Restores the local Postgres DB from the golden snapshot
#      (clusters/rules back to pending, queue empty, merged CIs restored).
#   2. Deletes any identifiers you created during a rehearsal from the
#      ServiceNow instance, so the "create a rule live" beat works again.
#      (Keeps the Linux Server rule — beat 5's IRE match needs it.)
#
# Usage:  ./demo/reset-demo.sh
# The dev server can stay running; Next.js reconnects automatically.
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB="${DATABASE_URL:-postgresql://localhost:5432/cmdb_cockpit}"
GOLDEN="$HERE/golden-demo-db.sql"

if [[ ! -f "$GOLDEN" ]]; then
  echo "✗ golden snapshot not found at $GOLDEN" >&2
  exit 1
fi

echo "→ restoring local database from golden snapshot…"
# drop any open connections (dev server) so the schema drop can't hang, then reload
psql "$DB" -q -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
psql "$DB" -q -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
psql "$DB" -q < "$GOLDEN" >/dev/null
echo "  local DB restored to golden state."

echo "→ cleaning demo-created identifiers from the ServiceNow instance…"
node "$HERE/clean-instance.mjs"

echo "✓ demo reset complete — golden state restored, instance clean. Ready for the next run."
