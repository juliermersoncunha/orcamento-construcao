// Adds Material."priceDate" — the date the price refers to (e.g. supplier quote date).
// Usage:
//   node prisma/migrate-price-date.js                 -> uses DIRECT_DATABASE_URL (local)
//   node prisma/migrate-price-date.js "<conn-string>" -> explicit target (e.g. Supabase pooler)
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DIRECT_DATABASE_URL;

async function main() {
  if (!connectionString) throw new Error("No connection string (arg or DIRECT_DATABASE_URL)");

  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  await client.connect();
  console.log("Connected to database");

  await client.query(`ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "priceDate" TIMESTAMP(3)`);
  console.log('  Material += "priceDate"');

  const { rows } = await client.query(
    `select column_name, data_type, is_nullable
       from information_schema.columns
      where table_name = 'Material' and column_name = 'priceDate'`
  );
  console.log("  verify:", rows.length ? rows[0] : "NOT FOUND");

  await client.end();
  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
