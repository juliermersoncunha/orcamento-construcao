// Estimativa de preco por oficio e itens de gestao da obra. Idempotente.
// Usage: node prisma/migrate-estimativa.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS "ProjectCostLine" (
      "id"        TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
      "kind"      TEXT NOT NULL,
      "key"       TEXT NOT NULL,
      "amount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      "percent"   DOUBLE PRECISION,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ProjectCostLine_projectId_kind_key_key" ON "ProjectCostLine"("projectId","kind","key")`);
  const { rows } = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='ProjectCostLine'`);
  console.log("ProjectCostLine:", rows.length ? "OK" : "FALHOU");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
