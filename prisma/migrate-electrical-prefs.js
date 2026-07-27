// Adiciona preferências globais de acabamento elétrico ao ProjectInstallations
// (tipo de tomada, interruptor e ponto de luz). Idempotente. Não destrutivo:
// registros existentes ganham os defaults SIMPLES/SIMPLES/PLAFON_LED.
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

  const cols = [
    ["outletType",     "SIMPLES"],
    ["switchType",     "SIMPLES"],
    ["lightPointType", "PLAFON_LED"],
  ];
  for (const [col, def] of cols) {
    await client.query(`
      ALTER TABLE "ProjectInstallations"
        ADD COLUMN IF NOT EXISTS "${col}" TEXT NOT NULL DEFAULT '${def}'
    `);
    console.log(`  ProjectInstallations += "${col}" DEFAULT '${def}'`);
  }

  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'ProjectInstallations'
       AND column_name IN ('outletType','switchType','lightPointType')
  `);
  console.log("  verify:", rows.length === 3 ? "OK (3/3)" : `FAIL (${rows.length}/3)`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
