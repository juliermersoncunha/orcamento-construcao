// Cria as tabelas do cronograma da obra: ScheduleStage (etapas, com ordem
// editavel) e ScheduleStageMaterial (materiais escolhidos por etapa).
// Idempotente.
//
// Usage:
//   node prisma/migrate-cronograma.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DATABASE_URL;

async function main() {
  if (!connectionString) throw new Error("No connection string");
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  console.log("Connected");

  await client.query(`
    CREATE TABLE IF NOT EXISTS "ScheduleStage" (
      "id"          TEXT PRIMARY KEY,
      "projectId"   TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
      "order"       INTEGER NOT NULL,
      "name"        TEXT NOT NULL,
      "deliverable" TEXT,
      "dependsOn"   TEXT,
      "days"        DOUBLE PRECISION NOT NULL DEFAULT 0,
      "startDate"   TIMESTAMP(3),
      "status"      TEXT NOT NULL DEFAULT 'PENDENTE',
      "notes"       TEXT,
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "ScheduleStage_projectId_order_idx" ON "ScheduleStage"("projectId","order")`);
  console.log('  ScheduleStage OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS "ScheduleStageMaterial" (
      "id"         TEXT PRIMARY KEY,
      "stageId"    TEXT NOT NULL REFERENCES "ScheduleStage"("id") ON DELETE CASCADE,
      "materialId" TEXT NOT NULL REFERENCES "Material"("id"),
      "quantity"   DOUBLE PRECISION NOT NULL DEFAULT 0
    )
  `);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleStageMaterial_stageId_materialId_key" ON "ScheduleStageMaterial"("stageId","materialId")`);
  console.log('  ScheduleStageMaterial OK');

  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name IN ('ScheduleStage','ScheduleStageMaterial')
  `);
  console.log("  verify:", rows.length === 2 ? "OK" : `only ${rows.length}/2`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
