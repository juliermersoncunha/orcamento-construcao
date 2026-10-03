// Cria MaterialUsage: o registro de consumo real de material na obra
// (item, quantidade, onde foi utilizado, data). Idempotente.
//
// Usage: node prisma/migrate-consumo.js "<conn-string>"
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
    CREATE TABLE IF NOT EXISTS "MaterialUsage" (
      "id"         TEXT PRIMARY KEY,
      "projectId"  TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
      "materialId" TEXT NOT NULL REFERENCES "Material"("id"),
      "stageId"    TEXT REFERENCES "ScheduleStage"("id") ON DELETE SET NULL,
      "quantity"   DOUBLE PRECISION NOT NULL,
      "location"   TEXT,
      "usedAt"     TIMESTAMP(3) NOT NULL,
      "notes"      TEXT,
      "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "MaterialUsage_projectId_usedAt_idx" ON "MaterialUsage"("projectId","usedAt")`);

  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name='MaterialUsage'
  `);
  console.log("  MaterialUsage:", rows.length ? "OK" : "NOT FOUND");

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
