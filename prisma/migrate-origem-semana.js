// Origem escolhida pelo usuario na linha de material da semana. Idempotente.
// Usage: node prisma/migrate-origem-semana.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`ALTER TABLE "ScheduleWeekMaterial" ADD COLUMN IF NOT EXISTS "stageId" TEXT REFERENCES "ScheduleStage"("id") ON DELETE SET NULL`);
  console.log("ScheduleWeekMaterial.stageId OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
