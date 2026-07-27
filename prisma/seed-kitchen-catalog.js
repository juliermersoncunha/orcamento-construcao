// Seeds os materiais mínimos da cozinha padrão econômica no catálogo.
// Todos entram com preço R$ 0 — o usuário preenche em Admin › Materiais.
// Idempotente: cria só o que ainda não existe pelo nome.
//
// Usage:
//   node prisma/seed-kitchen-catalog.js
//   node prisma/seed-kitchen-catalog.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DATABASE_URL;

const MATERIALS = [
  // Louças / bancadas
  { name: "Pia de granito 1,20m (com cuba)",              unit: "un",  category: "LOUCAS_SANITARIAS" },
  { name: "Pia de aço inox 1,20m",                        unit: "un",  category: "LOUCAS_SANITARIAS" },
  { name: "Cuba de inox 40x34cm",                         unit: "un",  category: "LOUCAS_SANITARIAS" },
  { name: "Armário aéreo simples 1,20m",                  unit: "un",  category: "LOUCAS_SANITARIAS" },
  // Bancadas (por m²/m linear — nome varia com o material via resolver)
  { name: "Bancada de granito",                           unit: "m²",  category: "REVESTIMENTO" },
  { name: "Bancada de marmore",                           unit: "m²",  category: "REVESTIMENTO" },
  { name: "Bancada de quartzo",                           unit: "m²",  category: "REVESTIMENTO" },
  { name: "Frontão de granito 10cm",                      unit: "m",   category: "REVESTIMENTO" },
  { name: "Frontão de marmore 10cm",                      unit: "m",   category: "REVESTIMENTO" },
  { name: "Frontão de quartzo 10cm",                      unit: "m",   category: "REVESTIMENTO" },
  { name: "Recorte para cuba",                            unit: "un",  category: "REVESTIMENTO" },
  // Metais
  { name: "Torneira de parede para cozinha",              unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Torneira de bancada para cozinha",             unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Válvula de escoamento cozinha 4,5\"",          unit: "un",  category: "METAIS_SANITARIOS" },
  // Acessórios hidráulicos
  { name: "Sifão sanfonado universal",                    unit: "un",  category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Suporte / mão-francesa",                       unit: "par", category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Silicone incolor",                             unit: "tubo",category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Kit fixação torneira",                         unit: "kit", category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Adesivo para bancada",                         unit: "un",  category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Kit fixação para armário",                     unit: "kit", category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Kit fixação depurador/coifa",                  unit: "kit", category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Grelha externa 100mm",                         unit: "un",  category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Ralo seco 100x100mm",                          unit: "un",  category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Filtro de água simples",                       unit: "un",  category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Kit instalação filtro",                        unit: "kit", category: "ACESSORIOS_HIDRAULICOS" },
  // Kit gás
  { name: "Regulador de gás P13",                         unit: "un",  category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Mangueira flexível para gás 1,25m",            unit: "un",  category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Abraçadeira para mangueira de gás",            unit: "un",  category: "ACESSORIOS_HIDRAULICOS" },
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
  for (const m of MATERIALS) {
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
  console.log(`  criados: ${created} | ja existiam: ${existing} | total: ${MATERIALS.length}`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
