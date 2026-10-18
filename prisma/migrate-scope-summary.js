// Escopo resumido editável do relatório. Idempotente.
// Usage: node prisma/migrate-scope-summary.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "scopeSummary" TEXT`);
  console.log("Project.scopeSummary OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
