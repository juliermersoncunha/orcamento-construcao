require("dotenv").config();
const { Client } = require("pg");
async function main() {
  const c = new Client({ connectionString: process.env.DIRECT_DATABASE_URL });
  await c.connect();
  // Delete budget items with old phase values so users must recalculate
  const r = await c.query(`DELETE FROM "BudgetItem" WHERE phase IN ('INSTALACOES_HIDRAULICAS', 'ESQUADRIAS')`);
  console.log(`Removed ${r.rowCount} stale budget items with old phase values.`);
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
