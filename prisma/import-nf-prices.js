// Importa preços extraídos das notas fiscais do usuário (junho/julho 2026).
// Preço = valor líquido unitário (já descontado), que é o custo efetivamente pago.
//
// Idempotente: reexecutar só reescreve o mesmo preço.
//
// Usage:
//   node prisma/import-nf-prices.js            -> grava
//   node prisma/import-nf-prices.js --dry-run  -> só mostra o que faria
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.env.DIRECT_DATABASE_URL;
const DRY = process.argv.includes("--dry-run");

// ── Materiais que já existem no catálogo e estavam sem preço ───────────────
// nome no catálogo -> [preço líquido, item da nota que originou]
const UPDATE = {
  "Folha de porta interna":          [165.00, "PORTA REVESTIDA BRANCA 70CM"],
  "Batente / marco de porta":        [135.00, "CAIXA DE PORTA CUPIUBA VERMELHA / 70CM"],
  "Kit de alisar (guarnição)":       [ 60.86, "ALISAR KIT / CUPIUBA"],
  "Kit 3 dobradiças":                [ 10.80, "DOBRADICA 3 C/03UNID SIGMA"],
  "Fechadura banheiro (privacidade)":[ 31.16, "Fechadura Alianca 2800/41 Wc Banheiro"],
  "Torneira para lavatório":         [ 26.24, "Torneira De Banheiro Pia Lavatorio Cuba Bancada"],
  "Sifão sanfonado":                 [ 10.84, "SIFAO TIGRE 66CM"],
  "Cabo flexível 6mm²":              [  7.01, "CABO FLEX BOB 6,0MM AZ 750V (LAMESA)"],
  "Cabo flexível 6mm² (terra)":      [  7.01, "CABO FLEX BOB 6,0MM PT 750V (LAMESA)"],
};

// ── Itens das notas que ainda não existiam no catálogo ─────────────────────
const CREATE = [
  // Pintura
  ["Massa corrida 25kg",                  "un", "PINTURA",  44.98],
  ["Tinta acrílica 15L",                  "un", "PINTURA", 106.86],
  ["Tinta acrílica 3L",                   "un", "PINTURA",  31.30],
  ["Tinta piso e parede 3L",              "un", "PINTURA",  61.88],
  ["Tinta esmalte 3L",                    "un", "PINTURA", 106.14],
  ["Textura lisa 20kg",                   "un", "PINTURA", 138.34],
  ["Cal hidratada 5kg",                   "un", "PINTURA",  12.41],
  ["Lixa para massa",                     "un", "PINTURA",   1.80],
  ["Limpa pedras 5L",                     "un", "PINTURA",  59.00],
  // Elétrica
  ["Disjuntor monopolar 16A",             "un", "ELETRICA",  9.21],
  ["Disjuntor monopolar 25A",             "un", "ELETRICA",  9.21],
  ["Disjuntor monopolar 40A",             "un", "ELETRICA", 10.98],
  ["Disjuntor monopolar 63A",             "un", "ELETRICA", 13.49],
  ["Interruptor DR 2P 30mA",              "un", "ELETRICA", 67.00],
  ["Haste de aterramento 5/8\" x 1,50m",  "un", "ELETRICA", 32.78],
  ["Conector de aterramento",             "un", "ELETRICA",  7.37],
  ["Cabo flexível 2x2,5mm²",              "m",  "ELETRICA",  8.65],
  ["Lâmpada LED bulbo 9W",                "un", "ELETRICA",  6.50],
  ["Lâmpada LED bulbo 20W",               "un", "ELETRICA",  7.60],
  ["Plafon plástico E-27",                "un", "ELETRICA",  3.84],
  ["Luminária tartaruga com grade",       "un", "ELETRICA", 12.70],
  ["Tomada 2P+T 10A",                     "un", "ELETRICA",  8.65],
  ["Interruptor simples 10A",             "un", "ELETRICA",  7.82],
  ["Conjunto 1 interruptor + 1 tomada",   "un", "ELETRICA", 14.24],
  ["Conjunto 3 tomadas 2P+T 10A",         "un", "ELETRICA", 23.06],
  ["Plug macho 2P 10A",                   "un", "ELETRICA",  2.60],
  ["Fita isolante 19mm x 20m",            "un", "ELETRICA", 19.90],
  ["Passa-fio helicoidal 10m",            "un", "ELETRICA", 44.32],
  // Hidráulica
  ["Joelho 75mm esgoto 90°",              "un", "HIDRAULICA", 6.34],
  // Cobertura / estrutura
  ["Telha colonial",                      "un", "COBERTURA",  1.10],
  ["Prego 3x8",                           "kg", "ESTRUTURA", 24.80],
  ["Prego sem cabeça 3/4x17",             "kg", "ESTRUTURA", 16.74],
  // Outros
  ["Churrasqueira pré-moldada pequena",   "un", "OUTROS",   870.00],
];

async function main() {
  if (!connectionString) throw new Error("No DIRECT_DATABASE_URL");
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  console.log(`Connected${DRY ? " (DRY RUN)" : ""}\n`);

  console.log("── Preços preenchidos (materiais já existentes) ──");
  let updated = 0, missing = 0;
  for (const [name, [price, origem]] of Object.entries(UPDATE)) {
    const { rows } = await client.query(
      `SELECT id, "currentPrice" FROM "Material" WHERE name = $1 AND active = true`, [name]
    );
    if (rows.length === 0) {
      console.log(`  NAO ENCONTRADO: "${name}"`);
      missing++;
      continue;
    }
    const before = rows[0].currentPrice;
    if (!DRY) {
      await client.query(
        `UPDATE "Material" SET "currentPrice" = $1, "priceDate" = NOW(), "updatedAt" = NOW() WHERE id = $2`,
        [price, rows[0].id]
      );
    }
    console.log(`  ${name.padEnd(34)} R$ ${String(before).padStart(7)} -> ${String(price).padStart(7)}   (${origem})`);
    updated++;
  }

  console.log("\n── Materiais novos ──");
  let created = 0, existed = 0;
  for (const [name, unit, category, price] of CREATE) {
    const { rows } = await client.query(`SELECT id FROM "Material" WHERE name = $1`, [name]);
    if (rows.length > 0) { existed++; continue; }
    if (!DRY) {
      await client.query(
        `INSERT INTO "Material" (id, name, unit, category, "currentPrice", "priceDate", active, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), true, NOW(), NOW())`,
        [name, unit, category, price]
      );
    }
    console.log(`  + ${name.padEnd(36)} ${unit.padEnd(3)} ${category.padEnd(11)} R$ ${price}`);
    created++;
  }

  const { rows: z } = await client.query(
    `SELECT COUNT(*)::int AS n FROM "Material" WHERE active = true AND "currentPrice" = 0`
  );
  console.log(`\nAtualizados: ${updated} | nao encontrados: ${missing} | criados: ${created} | ja existiam: ${existed}`);
  console.log(`Materiais ativos ainda sem preco: ${z[0].n}`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
