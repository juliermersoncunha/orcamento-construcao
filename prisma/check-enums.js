require("dotenv").config();
const { Client } = require("pg");
async function main() {
  const c = new Client({ connectionString: process.env.DIRECT_DATABASE_URL });
  await c.connect();
  const r = await c.query(`SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'PhaseType' ORDER BY e.enumsortorder`);
  console.log("PhaseType values:", r.rows.map(x => x.enumlabel).join(", "));
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
