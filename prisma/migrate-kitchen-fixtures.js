// Adiciona valores ao enum FixtureType para os equipamentos da cozinha padrão
// econômica. Não altera projetos existentes; enum ganha valores adicionais e
// nenhum registro perde compatibilidade.
//
// Idempotente: usa ADD VALUE IF NOT EXISTS.
//
// Usage:
//   node prisma/migrate-kitchen-fixtures.js
//   node prisma/migrate-kitchen-fixtures.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DATABASE_URL;

const NEW_VALUES = [
  "PIA_GRANITO",
  "PIA_INOX",
  "BANCADA_COZINHA",
  "TORNEIRA_COZINHA_PAREDE",
  "TORNEIRA_COZINHA_BANCADA",
  "KIT_BOTIJAO_GAS",
];

async function main() {
  if (!connectionString) throw new Error("No connection string");
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  console.log("Connected to database");

  // Enum ADD VALUE não pode rodar dentro de transação implícita — cada valor
  // é um statement separado.
  for (const v of NEW_VALUES) {
    await client.query(`ALTER TYPE "FixtureType" ADD VALUE IF NOT EXISTS '${v}'`);
    console.log(`  FixtureType += ${v}`);
  }

  const { rows } = await client.query(`
    SELECT unnest(enum_range(NULL::"FixtureType"))::text AS v
  `);
  const have = new Set(rows.map((r) => r.v));
  const missing = NEW_VALUES.filter((v) => !have.has(v));
  console.log("  verify:", missing.length === 0 ? "OK" : `MISSING: ${missing.join(", ")}`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
