// Desconto de vãos no azulejo: RoomWallFinish.openingsM2 (por parede) e
// RoomFinish.wallTileOpenings (modo "todas as paredes"). Idempotente.
//
// Usage:
//   node prisma/migrate-tile-openings.js "<conn-string>"
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
    ALTER TABLE "RoomWallFinish"
      ADD COLUMN IF NOT EXISTS "openingsM2" DOUBLE PRECISION NOT NULL DEFAULT 0
  `);
  await client.query(`
    ALTER TABLE "RoomFinish"
      ADD COLUMN IF NOT EXISTS "wallTileOpenings" DOUBLE PRECISION NOT NULL DEFAULT 0
  `);

  const { rows } = await client.query(`
    SELECT table_name, column_name FROM information_schema.columns
     WHERE (table_name = 'RoomWallFinish' AND column_name = 'openingsM2')
        OR (table_name = 'RoomFinish'     AND column_name = 'wallTileOpenings')
  `);
  rows.forEach((r) => console.log(`  ${r.table_name}.${r.column_name} OK`));
  console.log("  verify:", rows.length === 2 ? "OK" : `only ${rows.length}/2`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
