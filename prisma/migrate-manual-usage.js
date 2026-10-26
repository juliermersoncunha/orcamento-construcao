// Onde o material avulso será usado. Idempotente.
// Usage: node prisma/migrate-manual-usage.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`ALTER TABLE "ManualBudgetItem" ADD COLUMN IF NOT EXISTS "usage" TEXT`);
  console.log("ManualBudgetItem.usage OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
