// Estoque e consumo automatico. Idempotente.
//  - ScheduleWeekPurchase += quantity, createdAt (o que entrou na obra)
//  - MaterialUsage += autoStageId, autoQuantity (consumo lancado ao concluir etapa)
// Usage: node prisma/migrate-estoque-consumo.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;

async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`ALTER TABLE "ScheduleWeekPurchase" ADD COLUMN IF NOT EXISTS "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0`);
  await c.query(`ALTER TABLE "ScheduleWeekPurchase" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await c.query(`ALTER TABLE "MaterialUsage" ADD COLUMN IF NOT EXISTS "autoStageId" TEXT`);
  await c.query(`ALTER TABLE "MaterialUsage" ADD COLUMN IF NOT EXISTS "autoQuantity" DOUBLE PRECISION`);
  console.log("colunas OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
