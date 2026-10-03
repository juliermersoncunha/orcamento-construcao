// Cria ScheduleTask: as sub-etapas (passo a passo) dentro de cada etapa do
// cronograma. Idempotente.
//
// Usage: node prisma/migrate-subetapas.js "<conn-string>"
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
    CREATE TABLE IF NOT EXISTS "ScheduleTask" (
      "id"      TEXT PRIMARY KEY,
      "stageId" TEXT NOT NULL REFERENCES "ScheduleStage"("id") ON DELETE CASCADE,
      "order"   INTEGER NOT NULL,
      "name"    TEXT NOT NULL,
      "done"    BOOLEAN NOT NULL DEFAULT false
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "ScheduleTask_stageId_order_idx" ON "ScheduleTask"("stageId","order")`);

  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name = 'ScheduleTask'
  `);
  console.log("  ScheduleTask:", rows.length ? "OK" : "NOT FOUND");

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
