#!/usr/bin/env bash
# =============================================================================
# SteamPulse — Step 4: Run Database Migrations
# Run this on the SERVER after first deploy to create all DB tables.
# Usage: ssh root@<server> 'bash /opt/steampulse/deploy/04-migrate-db.sh'
# =============================================================================
set -euo pipefail

APP_DIR="/opt/steampulse"
cd "$APP_DIR"

echo "=============================================="
echo "  SteamPulse — Database Migration"
echo "=============================================="

# Load environment
if [[ -f "$APP_DIR/.env" ]]; then
  export $(grep -v '^#' "$APP_DIR/.env" | xargs)
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL is not set. Please configure .env first."
  exit 1
fi

echo "Running migrations against: ${DATABASE_URL%%@*}@***"
echo ""

# Apply each migration SQL file in order
for sql_file in drizzle/0000_brainy_pete_wisdom.sql \
                drizzle/0001_keen_slayback.sql \
                drizzle/0002_nappy_namorita.sql \
                drizzle/0003_tan_molly_hayes.sql; do
  if [[ -f "$sql_file" ]]; then
    echo "  Applying: $sql_file"
    # Split on --> statement-breakpoint and run each statement
    # Using Node.js for reliable MySQL execution
    node -e "
const mysql = require('mysql2/promise');
const fs = require('fs');
async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const sql = fs.readFileSync('$sql_file', 'utf8');
  const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      await conn.execute(stmt);
      console.log('    ✅ OK:', stmt.substring(0, 60).replace(/\n/g,' ') + '...');
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_FIELDNAME') {
        console.log('    ⚠️  Already exists (skipped):', stmt.substring(0, 60).replace(/\n/g,' ') + '...');
      } else {
        console.error('    ❌ Error:', e.message);
      }
    }
  }
  await conn.end();
}
run().catch(console.error);
"
  fi
done

echo ""
echo "✅ Database migration complete!"
echo ""
echo "Next: Restart the app:  systemctl restart steampulse"
