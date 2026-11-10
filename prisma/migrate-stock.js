// Estoque da empresa: depósito, ferramentas e seus movimentos. Idempotente.
// Usage: node prisma/migrate-stock.js "<conn-string>"
require("dotenv").config({ quiet: true });
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS "StockMovement" (
      "id"          TEXT             NOT NULL PRIMARY KEY,
      "kind"        TEXT             NOT NULL,
      "materialId"  TEXT             NOT NULL REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "quantity"    DOUBLE PRECISION NOT NULL,
      "unitCost"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      "projectId"   TEXT             REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "supplierId"  TEXT             REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "date"        TIMESTAMP(3)     NOT NULL,
      "notes"       TEXT,
      "createdById" TEXT,
      "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await c.query(`CREATE INDEX IF NOT EXISTS "StockMovement_materialId_date_idx" ON "StockMovement"("materialId", "date")`);
  await c.query(`CREATE INDEX IF NOT EXISTS "StockMovement_projectId_idx" ON "StockMovement"("projectId")`);
  await c.query(`
    CREATE TABLE IF NOT EXISTS "Tool" (
      "id"        TEXT             NOT NULL PRIMARY KEY,
      "name"      TEXT             NOT NULL,
      "code"      TEXT,
      "unitValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes"     TEXT,
      "active"    BOOLEAN          NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await c.query(`
    CREATE TABLE IF NOT EXISTS "ToolMovement" (
      "id"        TEXT         NOT NULL PRIMARY KEY,
      "toolId"    TEXT         NOT NULL REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "kind"      TEXT         NOT NULL,
      "quantity"  INTEGER      NOT NULL,
      "projectId" TEXT         REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "date"      TIMESTAMP(3) NOT NULL,
      "notes"     TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await c.query(`CREATE INDEX IF NOT EXISTS "ToolMovement_toolId_idx" ON "ToolMovement"("toolId")`);
  await c.query(`CREATE INDEX IF NOT EXISTS "ToolMovement_projectId_idx" ON "ToolMovement"("projectId")`);
  console.log("estoque OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
