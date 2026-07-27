// Adiciona RoomWallFinish.wallLength (nullable) para o modo "só a parede da
// pia" da cozinha. Não afeta o banheiro (permanece nulo, motor usa o
// perímetro).
//
// Idempotente. Não destrutivo.
//
// Usage:
//   node prisma/migrate-wall-length.js
//   node prisma/migrate-wall-length.js "<conn-string>"
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

  await client.query(`ALTER TABLE "RoomWallFinish" ADD COLUMN IF NOT EXISTS "wallLength" DOUBLE PRECISION`);
  console.log(`  RoomWallFinish += "wallLength"`);

  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'RoomWallFinish' AND column_name = 'wallLength'
  `);
  console.log("  verify:", rows.length ? "OK" : "NOT FOUND");

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
