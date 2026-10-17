// Mao de obra por funcao fixa. Idempotente.
// Usage: node prisma/migrate-labor-lines.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS "LaborLine" (
      "id"        TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
      "role"      TEXT NOT NULL,
      "label"     TEXT,
      "value"     DOUBLE PRECISION NOT NULL DEFAULT 0,
      "order"     INTEGER NOT NULL DEFAULT 0
    )`);
  await c.query(`CREATE INDEX IF NOT EXISTS "LaborLine_projectId_idx" ON "LaborLine"("projectId")`);
  console.log("LaborLine OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
