// Adiciona ProjectStructure.escavacaoM3 e compactacaoM2 para entrada manual
// dos volumes de terraplenagem. Idempotente.
//
// Usage:
//   node prisma/migrate-terraplenagem-manual.js
//   node prisma/migrate-terraplenagem-manual.js "<conn-string>"
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
    ALTER TABLE "ProjectStructure"
      ADD COLUMN IF NOT EXISTS "escavacaoM3" DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "compactacaoM2" DOUBLE PRECISION NOT NULL DEFAULT 0
  `);
  console.log(`  ProjectStructure += "escavacaoM3", "compactacaoM2" (DEFAULT 0)`);

  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'ProjectStructure'
       AND column_name IN ('escavacaoM3', 'compactacaoM2')
  `);
  console.log("  verify:", rows.length === 2 ? "OK" : `only ${rows.length}/2 found`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
