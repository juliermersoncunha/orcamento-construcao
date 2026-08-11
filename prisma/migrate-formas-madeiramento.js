// Adiciona ProjectStructure.formasM2 e ProjectRoofing.caibroM/ripaM para entrada
// manual de fôrmas de madeira e madeiramento do telhado. Idempotente.
//
// Usage:
//   node prisma/migrate-formas-madeiramento.js
//   node prisma/migrate-formas-madeiramento.js "<conn-string>"
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
      ADD COLUMN IF NOT EXISTS "formasM2"        DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "radierEspessura" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
      ADD COLUMN IF NOT EXISTS "radierArea"      DOUBLE PRECISION NOT NULL DEFAULT 0
  `);
  console.log(`  ProjectStructure += "formasM2", "radierEspessura", "radierArea"`);

  await client.query(`
    ALTER TABLE "ProjectRoofing"
      ADD COLUMN IF NOT EXISTS "caibroM" DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "ripaM"   DOUBLE PRECISION NOT NULL DEFAULT 0
  `);
  console.log(`  ProjectRoofing += "caibroM", "ripaM"`);

  const { rows } = await client.query(`
    SELECT table_name, column_name FROM information_schema.columns
     WHERE (table_name = 'ProjectStructure' AND column_name IN ('formasM2','radierEspessura','radierArea'))
        OR (table_name = 'ProjectRoofing' AND column_name IN ('caibroM','ripaM'))
  `);
  console.log("  verify:", rows.length === 5 ? "OK" : `only ${rows.length}/5 found`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
