// Adiciona ManualBudgetItem.phase para que o usuário escolha em qual fase o
// material avulso entra (Laje, Cobertura, ...). Idempotente.
//
// Usage:
//   node prisma/migrate-manual-phase.js
//   node prisma/migrate-manual-phase.js "<conn-string>"
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
    ALTER TABLE "ManualBudgetItem"
      ADD COLUMN IF NOT EXISTS "phase" "PhaseType"
  `);
  console.log('  ManualBudgetItem += "phase" (PhaseType, nullable)');

  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'ManualBudgetItem' AND column_name = 'phase'
  `);
  console.log("  verify:", rows.length ? "OK" : "NOT FOUND");

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
