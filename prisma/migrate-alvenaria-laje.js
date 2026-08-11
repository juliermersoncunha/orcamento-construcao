// Adiciona à ProjectStructure os campos de alvenaria manual (perímetros, pé-direito,
// platibanda) e o tipo de laje (forro | piso). Idempotente.
//
// Usage:
//   node prisma/migrate-alvenaria-laje.js
//   node prisma/migrate-alvenaria-laje.js "<conn-string>"
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
      ADD COLUMN IF NOT EXISTS "perimetroParedesExt" DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "perimetroParedesInt" DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "peDireito"           DOUBLE PRECISION NOT NULL DEFAULT 2.8,
      ADD COLUMN IF NOT EXISTS "hasPlatibanda"       BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "platibandaML"        DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "platibandaAltura"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "lajeType"            TEXT NOT NULL DEFAULT 'forro'
  `);
  console.log("  ProjectStructure += alvenaria manual + lajeType");

  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'ProjectStructure'
       AND column_name IN ('perimetroParedesExt','perimetroParedesInt','peDireito',
                           'hasPlatibanda','platibandaML','platibandaAltura','lajeType')
  `);
  console.log("  verify:", rows.length === 7 ? "OK" : `only ${rows.length}/7 found`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
