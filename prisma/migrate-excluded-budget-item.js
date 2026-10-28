// Item calculado substituído por lançamento manual. Idempotente.
// Usage: node prisma/migrate-excluded-budget-item.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS "ExcludedBudgetItem" (
      "id"           TEXT             NOT NULL PRIMARY KEY,
      "projectId"    TEXT             NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "phase"        "PhaseType"      NOT NULL,
      "materialId"   TEXT             NOT NULL REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "calcQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ExcludedBudgetItem_projectId_phase_materialId_key"
    ON "ExcludedBudgetItem"("projectId", "phase", "materialId")`);
  console.log("ExcludedBudgetItem OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
