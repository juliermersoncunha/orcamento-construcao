// Adds Accessory.configJson (nullable) so accessories can carry dimensions
// (espelho largura×altura, gabinete largura, nicho, barra de apoio…).
//
// Usage:
//   node prisma/migrate-accessory-config.js
//   node prisma/migrate-accessory-config.js "<conn-string>"
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

  await client.query(`ALTER TABLE "Accessory" ADD COLUMN IF NOT EXISTS "configJson" TEXT`);
  console.log(`  Accessory += "configJson"`);

  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'Accessory' AND column_name = 'configJson'`
  );
  console.log("  verify:", rows.length ? "OK" : "NOT FOUND");

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
