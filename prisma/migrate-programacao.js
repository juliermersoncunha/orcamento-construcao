// Programacao semanal, realizado e linha de base do cronograma. Idempotente.
// Usage: node prisma/migrate-programacao.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;

async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "scheduleBaselineAt" TIMESTAMP(3)`);
  for (const col of ["realStart", "realEnd", "baselineStart", "baselineEnd"]) {
    await c.query(`ALTER TABLE "ScheduleStage" ADD COLUMN IF NOT EXISTS "${col}" TIMESTAMP(3)`);
  }
  await c.query(`
    CREATE TABLE IF NOT EXISTS "ScheduleWeekStage" (
      "id"        TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
      "stageId"   TEXT NOT NULL REFERENCES "ScheduleStage"("id") ON DELETE CASCADE,
      "weekStart" TIMESTAMP(3) NOT NULL
    )`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleWeekStage_stageId_weekStart_key" ON "ScheduleWeekStage"("stageId","weekStart")`);
  await c.query(`CREATE INDEX IF NOT EXISTS "ScheduleWeekStage_projectId_weekStart_idx" ON "ScheduleWeekStage"("projectId","weekStart")`);
  await c.query(`
    CREATE TABLE IF NOT EXISTS "ScheduleWeekMaterial" (
      "id"         TEXT PRIMARY KEY,
      "projectId"  TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
      "materialId" TEXT NOT NULL REFERENCES "Material"("id"),
      "weekStart"  TIMESTAMP(3) NOT NULL,
      "quantity"   DOUBLE PRECISION NOT NULL
    )`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleWeekMaterial_projectId_weekStart_materialId_key" ON "ScheduleWeekMaterial"("projectId","weekStart","materialId")`);
  const { rows } = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('ScheduleWeekStage','ScheduleWeekMaterial')`);
  console.log("tabelas:", rows.length === 2 ? "OK" : rows.length + "/2");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
