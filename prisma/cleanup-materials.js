// Exclui do catálogo materiais desativados que já não são referenciados por
// nenhum BudgetItem, ManualBudgetItem ou PriceHistory. Idempotente.
//
// Segurança: verifica cada material antes de apagar — se aparecer qualquer
// referência, o item é preservado (não silencia FK errors).
//
// Usage:
//   node prisma/cleanup-materials.js
//   node prisma/cleanup-materials.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DATABASE_URL;

async function main() {
  if (!connectionString) throw new Error("No connection string");
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  console.log("Connected");

  // Candidatos: desativados que não estão em nenhum orçamento (BudgetItem/
  // ManualBudgetItem). PriceHistory é apagado junto — foi decisão do usuário
  // para as variantes unificadas (cimento/areia/tijolo).
  const { rows } = await client.query(`
    SELECT m.id, m.name
      FROM "Material" m
      LEFT JOIN "BudgetItem"       bi ON bi."materialId" = m.id
      LEFT JOIN "ManualBudgetItem" mb ON mb."materialId" = m.id
     WHERE m.active = false
     GROUP BY m.id, m.name
    HAVING COUNT(bi.id) = 0 AND COUNT(mb.id) = 0
  `);

  console.log(`\nCandidatos para exclusão: ${rows.length}`);
  rows.forEach((r) => console.log(`  - ${r.name}`));

  let deleted = 0, phDeleted = 0;
  for (const r of rows) {
    try {
      const { rowCount: ph } = await client.query(
        `DELETE FROM "PriceHistory" WHERE "materialId" = $1`, [r.id]
      );
      phDeleted += ph ?? 0;
      await client.query(`DELETE FROM "Material" WHERE id = $1`, [r.id]);
      deleted++;
    } catch (e) {
      console.log(`  ! não foi possível excluir "${r.name}": ${e.message}`);
    }
  }
  console.log(`\nExcluídos: ${deleted} materiais (+ ${phDeleted} linhas de histórico)`);

  const { rows: totais } = await client.query(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE active) ::int AS ativos,
           COUNT(*) FILTER (WHERE NOT active) ::int AS desativados
      FROM "Material"
  `);
  console.log(`Total agora: ${totais[0].total}  ativos: ${totais[0].ativos}  desativados: ${totais[0].desativados}`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
