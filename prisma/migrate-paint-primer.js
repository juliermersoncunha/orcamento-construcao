// Base da pintura por projeto. Idempotente.
// Usage: node prisma/migrate-paint-primer.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "paintPrimer" TEXT NOT NULL DEFAULT 'SELADOR'`);
  console.log("Project.paintPrimer OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
