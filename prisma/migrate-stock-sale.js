// Venda pelo depósito: preço cobrado e comprador no movimento. Idempotente.
// Usage: node prisma/migrate-stock-sale.js "<conn-string>"
require("dotenv").config({ quiet: true });
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`ALTER TABLE "StockMovement"
    ADD COLUMN IF NOT EXISTS "salePrice" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "buyer"     TEXT`);
  console.log("StockMovement: venda OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
