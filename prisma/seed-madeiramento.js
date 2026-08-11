// Linha e barrote no catálogo (categoria COBERTURA). Idempotente.
require("dotenv").config();
const { Client } = require("pg");
const NOVOS = [
  { name: "Linha 6x12cm (pinus)",  unit: "m", category: "COBERTURA" },
  { name: "Barrote 6x6cm (pinus)", unit: "m", category: "COBERTURA" },
];
async function main() {
  const client = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
  await client.connect();
  for (const m of NOVOS) {
    const { rows } = await client.query('SELECT id, active FROM "Material" WHERE name = $1', [m.name]);
    if (rows.length) {
      await client.query('UPDATE "Material" SET active = true, unit = $2, category = $3::"MaterialCategory" WHERE id = $1', [rows[0].id, m.unit, m.category]);
      console.log(`  ja existia, reativado: ${m.name}`);
    } else {
      await client.query(
        `INSERT INTO "Material" (id, name, unit, category, "currentPrice", active)
         VALUES (gen_random_uuid()::text, $1, $2, $3::"MaterialCategory", 0, true)`,
        [m.name, m.unit, m.category]
      );
      console.log(`  criado: ${m.name}  [${m.unit}]  R$ 0`);
    }
  }
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
