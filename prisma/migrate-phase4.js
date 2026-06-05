require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_DATABASE_URL });
  await client.connect();
  console.log("Connected.");

  await client.query(`
    ALTER TABLE "ProjectViability"
      ADD COLUMN IF NOT EXISTS "landValue"          DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "landAppraisalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "itivPercent"        DOUBLE PRECISION NOT NULL DEFAULT 2,
      ADD COLUMN IF NOT EXISTS "landDocPercent"     DOUBLE PRECISION NOT NULL DEFAULT 3.65,
      ADD COLUMN IF NOT EXISTS "hasSale"            BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "venalValue"         DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "saleDocPercent"     DOUBLE PRECISION NOT NULL DEFAULT 7.5,
      ADD COLUMN IF NOT EXISTS "brokeragePercent"   DOUBLE PRECISION NOT NULL DEFAULT 5,
      ADD COLUMN IF NOT EXISTS "irPercent"          DOUBLE PRECISION NOT NULL DEFAULT 15
  `);
  console.log("  ProjectViability: 9 colunas adicionadas.");

  await client.end();
  console.log("Migration complete.");
}

main().catch(e => { console.error(e); process.exit(1); });
