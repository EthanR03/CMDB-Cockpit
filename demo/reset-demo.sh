#!/usr/bin/env bash
#
# reset-demo.sh — reset the CMDB Cockpit demo to its EMPTY starting state,
# so you run the pipeline live during the demo.
#
#   1. Re-seeds the local DB: reloads the 113-CI staging bundle and clears all
#      agent output (findings, clusters, rules, topologies, remediations,
#      decisions, agent runs). Nothing shows until you click "Run agent pipeline".
#   2. Deletes any identifiers you created during a rehearsal from the
#      ServiceNow instance, so the "create a rule live" beat works again.
#      (Keeps the Linux Server rule — beat 5's IRE match needs it.)
#
# Usage:  ./demo/reset-demo.sh
# The dev server can stay running.
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
DB="${DATABASE_URL:-postgresql://localhost:5432/cmdb_cockpit}"

echo "→ re-seeding the local database to the empty starting state…"
DATABASE_URL="$DB" node "$REPO/scripts/seed.mjs"
echo "  staging bundle reloaded; all agent output cleared."

echo "→ cleaning demo-created identifiers from the ServiceNow instance…"
node "$HERE/clean-instance.mjs"

echo "✓ demo reset — empty state ready. Click \"Run agent pipeline\" in the app to populate it live."
