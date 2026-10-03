// Funde materiais duplicados: repassa TODAS as referencias para o sobrevivente
// e so entao apaga o perdedor. Nada de orcamento, cronograma ou historico se
// perde. Idempotente — se o perdedor ja nao existe, nao faz nada.
//
// Usage: node prisma/merge-materials.js "<conn>" "<nome sobrevivente>" "<nome perdedor>"
require("dotenv").config();
const { Client } = require("pg");

async function merge(client, keepId, dropId) {
  // Tabelas com unicidade por (dono, material): some a quantidade em vez de
  // violar a constraint quando os dois materiais aparecem no mesmo dono.
  await client.query(`
    UPDATE "ManualBudgetItem" a SET quantity = a.quantity + b.quantity
      FROM "ManualBudgetItem" b
     WHERE a."projectId" = b."projectId" AND a."materialId" = $1 AND b."materialId" = $2
  `, [keepId, dropId]);
  await client.query(`
    DELETE FROM "ManualBudgetItem" b
     WHERE b."materialId" = $2
       AND EXISTS (SELECT 1 FROM "ManualBudgetItem" a
                    WHERE a."projectId" = b."projectId" AND a."materialId" = $1)
  `, [keepId, dropId]);

  await client.query(`
    UPDATE "ScheduleStageMaterial" a SET quantity = a.quantity + b.quantity
      FROM "ScheduleStageMaterial" b
     WHERE a."stageId" = b."stageId" AND a."materialId" = $1 AND b."materialId" = $2
  `, [keepId, dropId]);
  await client.query(`
    DELETE FROM "ScheduleStageMaterial" b
     WHERE b."materialId" = $2
       AND EXISTS (SELECT 1 FROM "ScheduleStageMaterial" a
                    WHERE a."stageId" = b."stageId" AND a."materialId" = $1)
  `, [keepId, dropId]);

  const moved = {};
  for (const t of ["BudgetItem", "ManualBudgetItem", "ScheduleStageMaterial", "PriceHistory", "MaterialUsage"]) {
    const r = await client.query(`UPDATE "${t}" SET "materialId" = $1 WHERE "materialId" = $2`, [keepId, dropId]);
    if (r.rowCount) moved[t] = r.rowCount;
  }
  await client.query(`DELETE FROM "Material" WHERE id = $1`, [dropId]);
  return moved;
}

async function main() {
  const [conn, keepName, dropName] = process.argv.slice(2);
  if (!conn || !keepName || !dropName) throw new Error("uso: <conn> <manter> <excluir>");

  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const rows = (await client.query(
    `SELECT id, name, "currentPrice" FROM "Material" WHERE name = $1 OR name = $2 ORDER BY name`,
    [keepName, dropName]
  )).rows;

  const keep = rows.find((r) => r.name === keepName);
  const drop = rows.find((r) => r.name === dropName && r.id !== (keep && keep.id));
  if (!keep) throw new Error(`sobrevivente nao encontrado: ${keepName}`);
  if (!drop) { console.log(`  nada a fazer: "${dropName}" nao existe`); await client.end(); return; }

  await client.query("BEGIN");
  try {
    const moved = await merge(client, keep.id, drop.id);
    await client.query("COMMIT");
    console.log(`  "${dropName}" -> "${keepName}"  referencias movidas: ${JSON.stringify(moved)}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
  await client.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
