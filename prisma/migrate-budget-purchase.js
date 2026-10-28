// Material do orçamento já comprado. Idempotente.
// Usage: node prisma/migrate-budget-purchase.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS "BudgetPurchase" (
      "id"         TEXT         NOT NULL PRIMARY KEY,
      "projectId"  TEXT         NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "phase"      "PhaseType"  NOT NULL,
      "materialId" TEXT         NOT NULL REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "BudgetPurchase_projectId_phase_materialId_key"
    ON "BudgetPurchase"("projectId", "phase", "materialId")`);
  await c.query(`ALTER TABLE "BudgetPurchase" ADD COLUMN IF NOT EXISTS "quantity" DOUBLE PRECISION`);
  console.log("BudgetPurchase OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
