// Adds ProjectRoofing.tileSize (nullable) so o tamanho da telha de fibrocimento
// escolhido pelo usuário define a área útil e o material do catálogo.
//
// Usage:
//   node prisma/migrate-roofing-tilesize.js
//   node prisma/migrate-roofing-tilesize.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DIRECT_DATABASE_URL;

async function main() {
  if (!connectionString) throw new Error("No connection string (arg or DIRECT_DATABASE_URL)");
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  console.log("Connected to database");

  await client.query(`ALTER TABLE "ProjectRoofing" ADD COLUMN IF NOT EXISTS "tileSize" TEXT`);
  console.log(`  ProjectRoofing += "tileSize"`);

  // Projetos existentes de fibrocimento passam a apontar para o tamanho padrão,
  // que é o que o catálogo já tinha precificado.
  const { rowCount } = await client.query(
    `UPDATE "ProjectRoofing" SET "tileSize" = '2,44 x 1,1'
      WHERE "tileType" = 'fibrocimento' AND "tileSize" IS NULL`
  );
  console.log(`  backfill: ${rowCount} projeto(s) de fibrocimento -> "2,44 x 1,1"`);

  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ProjectRoofing' AND column_name = 'tileSize'`
  );
  console.log("  verify:", rows.length ? "OK" : "NOT FOUND");

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
