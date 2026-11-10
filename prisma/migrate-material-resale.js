// Preço de revenda e lucro (%) no catálogo de materiais. Idempotente.
// Usage: node prisma/migrate-material-resale.js "<conn-string>"
require("dotenv").config({ quiet: true });
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`ALTER TABLE "Material"
    ADD COLUMN IF NOT EXISTS "resalePrice"   DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "markupPercent" DOUBLE PRECISION`);
  console.log("Material: revenda OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
