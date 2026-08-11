// Remove do catálogo os dois kits de fixação de esquadria que saíram da
// biblioteca do banheiro (BATHROOM_DOOR_DEPENDENCIES / BATHROOM_WINDOW_DEPENDENCIES).
//
// Ordem importa: BudgetItem e ManualBudgetItem referenciam Material por FK, então
// as linhas saem antes do material. Idempotente — rodar de novo não faz nada.
//
// Usage:
//   node prisma/cleanup-kits-esquadria.js "<conn-string>"
//   node prisma/cleanup-kits-esquadria.js "<conn-string>" --apply
//
// Sem --apply só mostra o que seria apagado.
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DATABASE_URL;
const APPLY = process.argv.includes("--apply");

const NAMES = ["Kit fixação de janela", "Kit parafusos e buchas para porta"];

async function main() {
  if (!connectionString) throw new Error("No connection string");
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  console.log(APPLY ? "Connected (APPLY)" : "Connected (dry-run)");

  const { rows: mats } = await client.query(
    `SELECT id, name, unit, "currentPrice", active FROM "Material" WHERE name = ANY($1)`,
    [NAMES]
  );

  if (mats.length === 0) {
    console.log("  Nenhum dos dois materiais existe no catálogo. Nada a fazer.");
    await client.end();
    return;
  }

  for (const m of mats) {
    const { rows: bi } = await client.query(
      `SELECT count(*)::int AS n FROM "BudgetItem" WHERE "materialId" = $1`, [m.id]
    );
    const { rows: mbi } = await client.query(
      `SELECT count(*)::int AS n FROM "ManualBudgetItem" WHERE "materialId" = $1`, [m.id]
    );
    const { rows: ph } = await client.query(
      `SELECT count(*)::int AS n FROM "PriceHistory" WHERE "materialId" = $1`, [m.id]
    );
    console.log(
      `  "${m.name}" (${m.unit}, R$ ${m.currentPrice}) — ` +
      `${bi[0].n} item(ns) de orçamento, ${mbi[0].n} manual(is), ${ph[0].n} histórico(s)`
    );
  }

  if (!APPLY) {
    console.log("\n  Dry-run. Rode de novo com --apply para apagar.");
    await client.end();
    return;
  }

  const ids = mats.map((m) => m.id);
  await client.query(`BEGIN`);
  try {
    const r1 = await client.query(`DELETE FROM "BudgetItem" WHERE "materialId" = ANY($1)`, [ids]);
    const r2 = await client.query(`DELETE FROM "ManualBudgetItem" WHERE "materialId" = ANY($1)`, [ids]);
    const r3 = await client.query(`DELETE FROM "PriceHistory" WHERE "materialId" = ANY($1)`, [ids]);
    const r4 = await client.query(`DELETE FROM "Material" WHERE id = ANY($1)`, [ids]);
    await client.query(`COMMIT`);
    console.log(`\n  BudgetItem apagados:       ${r1.rowCount}`);
    console.log(`  ManualBudgetItem apagados: ${r2.rowCount}`);
    console.log(`  PriceHistory apagados:     ${r3.rowCount}`);
    console.log(`  Material apagados:         ${r4.rowCount}`);
  } catch (e) {
    await client.query(`ROLLBACK`);
    throw e;
  }

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
