// Remove um material do catálogo junto com o que aponta para ele
// (itens de orçamento, lançamentos manuais e histórico de preço).
//
// Usage: node prisma/purge-material.js "<conn>" "<nome exato>" [--dry]
const { Client } = require("pg");

const conn = process.argv[2];
const name = process.argv[3];
const dry = process.argv.includes("--dry");

const c = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function main() {
  await c.connect();
  const { rows } = await c.query(
    `SELECT id, name, unit, category, "currentPrice" p, active FROM "Material" WHERE name = $1`,
    [name]
  );
  if (rows.length === 0) {
    console.log(`Material "${name}" nao encontrado.`);
    return;
  }
  for (const m of rows) {
    console.log(`\n${m.name}  [${m.unit} / ${m.category}]  R$ ${m.p}  ativo=${m.active}`);
    const bi = await c.query(
      `SELECT b.quantity, b."unitPriceSnapshot" up, b.phase, p.name proj
         FROM "BudgetItem" b JOIN "Project" p ON p.id = b."projectId"
        WHERE b."materialId" = $1`,
      [m.id]
    );
    bi.rows.forEach((x) =>
      console.log(`   orcamento "${x.proj}" · ${x.phase} · ${x.quantity} × R$ ${x.up}`)
    );
    const mb = await c.query(
      `SELECT quantity, phase FROM "ManualBudgetItem" WHERE "materialId" = $1`, [m.id]
    );
    mb.rows.forEach((x) => console.log(`   lancamento manual · qtd ${x.quantity} · fase ${x.phase}`));
    const ph = await c.query(
      `SELECT count(*) n FROM "PriceHistory" WHERE "materialId" = $1`, [m.id]
    );
    console.log(`   historico de preco: ${ph.rows[0].n} registro(s)`);

    if (dry) { console.log("   [dry-run] nada apagado"); continue; }
    await c.query(`DELETE FROM "BudgetItem" WHERE "materialId" = $1`, [m.id]);
    await c.query(`DELETE FROM "ManualBudgetItem" WHERE "materialId" = $1`, [m.id]);
    await c.query(`DELETE FROM "PriceHistory" WHERE "materialId" = $1`, [m.id]);
    await c.query(`DELETE FROM "Material" WHERE id = $1`, [m.id]);
    console.log("   EXCLUIDO");
  }
}

main().then(() => c.end()).catch((e) => { console.error(e); process.exit(1); });
