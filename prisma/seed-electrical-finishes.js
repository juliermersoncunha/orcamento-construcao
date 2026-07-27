// Adiciona ao catálogo os acabamentos elétricos usados pelas escolhas globais.
// Idempotente. Cria só o que ainda não existe.
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DATABASE_URL;

const NOVOS = [
  { name: "Conjunto 2 tomadas 2P+T 10A", unit: "un", category: "ELETRICA" },
  { name: "Interruptor duplo 10A",       unit: "un", category: "ELETRICA" },
  { name: "Interruptor triplo 10A",      unit: "un", category: "ELETRICA" },
  { name: "Plafon LED 18W (integrado)",  unit: "un", category: "ELETRICA" },
];

function cuid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

async function main() {
  if (!connectionString) throw new Error("No connection string");
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  console.log("Connected");
  let created = 0, existing = 0;
  for (const m of NOVOS) {
    const { rows } = await client.query(`SELECT id FROM "Material" WHERE name = $1 LIMIT 1`, [m.name]);
    if (rows.length) { existing++; continue; }
    await client.query(
      `INSERT INTO "Material" (id, name, unit, category, "currentPrice", active, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4::"MaterialCategory", 0, true, NOW(), NOW())`,
      [cuid(), m.name, m.unit, m.category]
    );
    created++;
  }
  console.log(`  criados: ${created} | já existiam: ${existing}`);
  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
