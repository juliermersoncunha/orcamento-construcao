// Ajustes decididos pelo usuário:
//   1. O cálculo genérico de esquadrias passou a gerar "Soleira de Porta" no lugar
//      de "Batente/Marco de Porta". A grafia genérica fica órfã -> desativar.
//   2. "Quadro de Distribuição" alinhado ao valor da nota (R$ 38,22).
//
// Usage:
//   node prisma/fix-batente-quadro.js [--dry-run]
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.env.DIRECT_DATABASE_URL;
const DRY = process.argv.includes("--dry-run");

async function main() {
  if (!connectionString) throw new Error("No DIRECT_DATABASE_URL");
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  console.log(`Connected${DRY ? " (DRY RUN)" : ""}\n`);

  // 1. Batente genérico -> órfão
  const { rows: bat } = await client.query(
    `SELECT id, name, "currentPrice" FROM "Material"
      WHERE name = 'Batente/Marco de Porta' AND active = true`
  );
  if (bat.length === 0) {
    console.log(`  "Batente/Marco de Porta" ja inativo ou inexistente`);
  } else {
    const { rows: used } = await client.query(
      `SELECT COUNT(*)::int AS n FROM "BudgetItem" WHERE "materialId" = $1`, [bat[0].id]
    );
    console.log(`  "Batente/Marco de Porta" usado em ${used[0].n} item(ns) de orcamento`);
    if (!DRY) {
      await client.query(
        `UPDATE "Material" SET active = false, "updatedAt" = NOW() WHERE id = $1`, [bat[0].id]
      );
    }
    console.log(`  DESATIVADO (as linhas antigas somem ao regerar o orcamento)`);
  }

  // 2. Quadro de Distribuição
  const { rows: q } = await client.query(
    `SELECT id, "currentPrice" FROM "Material"
      WHERE name = 'Quadro de Distribuição' AND active = true`
  );
  if (q.length === 0) {
    console.log(`\n  "Quadro de Distribuição" NAO ENCONTRADO`);
  } else {
    console.log(`\n  "Quadro de Distribuição" R$ ${q[0].currentPrice} -> 38.22`);
    if (!DRY) {
      await client.query(
        `UPDATE "Material" SET "currentPrice" = 38.22, "priceDate" = NOW(), "updatedAt" = NOW() WHERE id = $1`,
        [q[0].id]
      );
    }
  }

  // 3. Conferencia: a soleira usada pelo calculo generico precisa existir e ter preco
  const { rows: sol } = await client.query(
    `SELECT name, unit, "currentPrice", active FROM "Material"
      WHERE name IN ('Soleira de Porta', 'Soleira de granito') ORDER BY name`
  );
  console.log("\n  Soleiras no catalogo:");
  sol.forEach((s) => console.log(`    "${s.name}" | ${s.unit} | R$ ${s.currentPrice} | active=${s.active}`));

  await client.end();
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
