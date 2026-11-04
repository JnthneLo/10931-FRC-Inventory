#!/usr/bin/env bash
# Git-based inventory backup: dumps SQLite to CSV and commits it.
# Run manually (`npm run backup`) or schedule it (cron/launchd).
set -euo pipefail
cd "$(dirname "$0")/.."

DB="inventory.db"
OUT="backup"
mkdir -p "$OUT"

sqlite3 "$DB" -header -csv "SELECT * FROM parts ORDER BY name" > "$OUT/parts.csv"
sqlite3 "$DB" -header -csv "SELECT * FROM transactions ORDER BY created_at" > "$OUT/transactions.csv"

git add "$OUT/parts.csv" "$OUT/transactions.csv"
if git diff --cached --quiet; then
  echo "backup: no changes"
else
  git commit -m "chore: inventory backup $(date '+%Y-%m-%d %H:%M')" >/dev/null
  echo "backup: committed $(date '+%H:%M')"
fi
