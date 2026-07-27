// Seeds os 39 materiais da lista fixa de tubos e conexões hidrossanitárias
// (água fria + esgoto). Todos entram com preço R$ 0 — o usuário preenche em
// Admin › Materiais. Idempotente: cria só o que ainda não existe pelo nome.
//
// Usage:
//   node prisma/seed-tubos-conexoes.js
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DATABASE_URL;

const AF = [
  { name: "Tubo PVC soldável 20 mm", unit: "m" },
  { name: "Tubo PVC soldável 25 mm", unit: "m" },
  { name: "Joelho 90° soldável 20 mm", unit: "un" },
  { name: "Joelho 90° soldável 25 mm", unit: "un" },
  { name: "Tê soldável 20 mm", unit: "un" },
  { name: "Tê soldável 25 mm", unit: "un" },
  { name: "Luva soldável 20 mm", unit: "un" },
  { name: "Luva soldável 25 mm", unit: "un" },
  { name: "Adaptador soldável com rosca 20 mm x 1/2\"", unit: "un" },
  { name: "Adaptador soldável com rosca 25 mm x 3/4\"", unit: "un" },
  { name: "Joelho soldável 90° com bucha de latão 20 mm x 1/2\"", unit: "un" },
  { name: "Bucha de redução soldável 25 mm x 20 mm", unit: "un" },
  { name: "Adesivo plástico PVC", unit: "un" },
  { name: "Solução preparadora PVC", unit: "un" },
  { name: "Abraçadeira de PVC 20 mm", unit: "un" },
  { name: "Abraçadeira de PVC 25 mm", unit: "un" },
];

const ES = [
  { name: "Tubo PVC esgoto 40 mm", unit: "m" },
  { name: "Tubo PVC esgoto 50 mm", unit: "m" },
  { name: "Tubo PVC esgoto 100 mm", unit: "m" },
  { name: "Joelho 45° PVC esgoto 40 mm", unit: "un" },
  { name: "Joelho 45° PVC esgoto 50 mm", unit: "un" },
  { name: "Joelho 45° PVC esgoto 100 mm", unit: "un" },
  { name: "Joelho 90° PVC esgoto 40 mm", unit: "un" },
  { name: "Joelho 90° PVC esgoto 50 mm", unit: "un" },
  { name: "Joelho 90° PVC esgoto 100 mm", unit: "un" },
  { name: "Tê sanitário PVC 40 mm", unit: "un" },
  { name: "Tê sanitário PVC 50 mm", unit: "un" },
  { name: "Tê sanitário PVC 100 mm", unit: "un" },
  { name: "Junção simples PVC 100 mm x 50 mm", unit: "un" },
  { name: "Luva PVC esgoto 40 mm", unit: "un" },
  { name: "Luva PVC esgoto 50 mm", unit: "un" },
  { name: "Luva PVC esgoto 100 mm", unit: "un" },
  { name: "Redução PVC esgoto 50 mm x 40 mm", unit: "un" },
  { name: "Redução PVC esgoto 100 mm x 50 mm", unit: "un" },
  { name: "Adaptador PVC esgoto para caixa sifonada", unit: "un" },
  { name: "Conexão para caixa sifonada", unit: "un" },
  { name: "Abraçadeira PVC esgoto 40 mm", unit: "un" },
  { name: "Abraçadeira PVC esgoto 50 mm", unit: "un" },
  { name: "Abraçadeira PVC esgoto 100 mm", unit: "un" },
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

  const all = [...AF.map((m) => ({ ...m, category: "HIDRAULICA" })),
               ...ES.map((m) => ({ ...m, category: "HIDRAULICA" }))];

  let created = 0, existing = 0;
  for (const m of all) {
    const { rows } = await client.query(
      `SELECT id FROM "Material" WHERE name = $1 LIMIT 1`, [m.name]
    );
    if (rows.length > 0) { existing++; continue; }
    await client.query(
      `INSERT INTO "Material" (id, name, unit, category, "currentPrice", active, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4::"MaterialCategory", 0, true, NOW(), NOW())`,
      [cuid(), m.name, m.unit, m.category]
    );
    created++;
  }
  console.log(`  criados: ${created} | ja existiam: ${existing} | total: ${all.length}`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
