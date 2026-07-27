// Cria materiais de acabamento de parede que faltam no catálogo e desativa
// duplicatas antigas do balde de massa corrida (agora comprada por kg).
// Idempotente e não destrutivo.
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DATABASE_URL;

const NOVOS = [
  { name: "Gesso liso",          unit: "kg", category: "PINTURA" },
  { name: "Selador acrílico",    unit: "L",  category: "PINTURA" },
];

const DESATIVAR = [
  "Massa Corrida PVA (20kg)",
  "Massa Corrida PVA (25kg)",
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
  console.log(`  novos criados: ${created} (${existing} já existiam)`);

  let deactivated = 0;
  for (const name of DESATIVAR) {
    const { rowCount } = await client.query(
      `UPDATE "Material" SET active = false, "updatedAt" = NOW()
        WHERE name = $1 AND active = true`, [name]
    );
    if (rowCount) deactivated += rowCount;
  }
  console.log(`  desativados: ${deactivated}`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
