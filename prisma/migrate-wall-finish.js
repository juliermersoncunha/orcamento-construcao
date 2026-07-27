// Adiciona ProjectFinishes.wallFinishType para escolher entre só tinta, massa
// corrida + tinta ou gesso + tinta antes da pintura. Idempotente.
//
// Usage:
//   node prisma/migrate-wall-finish.js
//   node prisma/migrate-wall-finish.js "<conn-string>"
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
    ALTER TABLE "ProjectFinishes"
      ADD COLUMN IF NOT EXISTS "wallFinishType" TEXT NOT NULL DEFAULT 'SO_TINTA'
  `);
  console.log(`  ProjectFinishes += "wallFinishType" (DEFAULT 'SO_TINTA')`);

  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'ProjectFinishes' AND column_name = 'wallFinishType'
  `);
  console.log("  verify:", rows.length ? "OK" : "NOT FOUND");

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
