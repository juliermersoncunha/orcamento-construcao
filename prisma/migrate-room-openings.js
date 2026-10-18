// Vãos de porta e janela por ambiente. Idempotente.
// Usage: node prisma/migrate-room-openings.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`
    ALTER TABLE "Room"
      ADD COLUMN IF NOT EXISTS "doors"        INTEGER          NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "doorWidth"    DOUBLE PRECISION NOT NULL DEFAULT 0.8,
      ADD COLUMN IF NOT EXISTS "doorHeight"   DOUBLE PRECISION NOT NULL DEFAULT 2.1,
      ADD COLUMN IF NOT EXISTS "windows"      INTEGER          NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "windowWidth"  DOUBLE PRECISION NOT NULL DEFAULT 1.2,
      ADD COLUMN IF NOT EXISTS "windowHeight" DOUBLE PRECISION NOT NULL DEFAULT 1.2`);
  console.log("Room: vãos OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
