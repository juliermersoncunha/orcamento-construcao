// Reforma: problemas da vistoria e servicos por ambiente. Idempotente.
// Usage: node prisma/migrate-reforma.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS "RenovationIssue" (
      "id"          TEXT PRIMARY KEY,
      "projectId"   TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
      "roomId"      TEXT REFERENCES "Room"("id") ON DELETE SET NULL,
      "category"    TEXT NOT NULL,
      "description" TEXT,
      "severity"    TEXT NOT NULL DEFAULT 'MEDIA',
      "order"       INTEGER NOT NULL DEFAULT 0,
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await c.query(`CREATE INDEX IF NOT EXISTS "RenovationIssue_projectId_idx" ON "RenovationIssue"("projectId")`);
  await c.query(`
    CREATE TABLE IF NOT EXISTS "RenovationService" (
      "id"         TEXT PRIMARY KEY,
      "projectId"  TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
      "roomId"     TEXT REFERENCES "Room"("id") ON DELETE SET NULL,
      "issueId"    TEXT REFERENCES "RenovationIssue"("id") ON DELETE SET NULL,
      "serviceKey" TEXT NOT NULL,
      "label"      TEXT,
      "quantity"   DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes"      TEXT,
      "order"      INTEGER NOT NULL DEFAULT 0,
      "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await c.query(`CREATE INDEX IF NOT EXISTS "RenovationService_projectId_idx" ON "RenovationService"("projectId")`);
  const { rows } = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('RenovationIssue','RenovationService')`);
  console.log("tabelas de reforma:", rows.length === 2 ? "OK" : rows.length + "/2");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
