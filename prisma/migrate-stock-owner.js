// Estoques virtuais (JCunha Construtora / Assessoria Strategi). Idempotente.
// O que já existe fica na Construtora.
// Usage: node prisma/migrate-stock-owner.js "<conn-string>"
require("dotenv").config({ quiet: true });
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "owner" TEXT NOT NULL DEFAULT 'CONSTRUTORA'`);
  await c.query(`ALTER TABLE "Tool" ADD COLUMN IF NOT EXISTS "owner" TEXT NOT NULL DEFAULT 'CONSTRUTORA'`);
  await c.query(`CREATE INDEX IF NOT EXISTS "StockMovement_owner_materialId_idx" ON "StockMovement"("owner", "materialId")`);
  console.log("estoques virtuais OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
