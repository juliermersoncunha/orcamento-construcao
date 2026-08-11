// Madeiramento: linha e barrote informados manualmente na Etapa 4. Idempotente.
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(`
    ALTER TABLE "ProjectRoofing"
      ADD COLUMN IF NOT EXISTS "linhaM"   DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "barroteM" DOUBLE PRECISION NOT NULL DEFAULT 0
  `);
  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name='ProjectRoofing' AND column_name IN ('linhaM','barroteM')`);
  console.log("verify:", rows.length === 2 ? "OK" : `only ${rows.length}/2`);
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
