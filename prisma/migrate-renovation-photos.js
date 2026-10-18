// Fotos da situação atual. Idempotente.
// Usage: node prisma/migrate-renovation-photos.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS "RenovationPhoto" (
      "id"        TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
      "roomId"    TEXT REFERENCES "Room"("id") ON DELETE SET NULL,
      "caption"   TEXT,
      "mime"      TEXT NOT NULL,
      "data"      BYTEA NOT NULL,
      "width"     INTEGER NOT NULL,
      "height"    INTEGER NOT NULL,
      "order"     INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await c.query(`CREATE INDEX IF NOT EXISTS "RenovationPhoto_projectId_idx" ON "RenovationPhoto"("projectId")`);
  console.log("RenovationPhoto OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
