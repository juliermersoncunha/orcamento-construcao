// Renomeia "Argamassa AC-III (assentamento porcelanato)" → "Argamassa AC-III".
//
// A AC-III passou a ser usada em dois lugares: piso de porcelanato E azulejo de
// parede de banheiro (área molhada). O parêntese virou mentira, então sai.
// Renomear preserva o id, o preço e todas as linhas de orçamento que apontam
// para ela.
//
// Se por algum motivo já existir um registro com o nome novo, o script avisa em
// vez de violar a unicidade — nesse caso a consolidação tem que ser manual.
//
// Usage:
//   node prisma/rename-argamassa-ac3.js "<conn-string>"
//   node prisma/rename-argamassa-ac3.js "<conn-string>" --apply
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DATABASE_URL;
const APPLY = process.argv.includes("--apply");

const OLD = "Argamassa AC-III (assentamento porcelanato)";
const NEW = "Argamassa AC-III";

async function main() {
  if (!connectionString) throw new Error("No connection string");
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  console.log(APPLY ? "Connected (APPLY)" : "Connected (dry-run)");

  const { rows: oldRows } = await client.query(
    `SELECT id, "currentPrice" FROM "Material" WHERE name = $1`, [OLD]
  );
  const { rows: newRows } = await client.query(
    `SELECT id, "currentPrice" FROM "Material" WHERE name = $1`, [NEW]
  );

  if (oldRows.length === 0) {
    console.log(`  "${OLD}" não existe — nada a renomear (provavelmente já rodou).`);
    await client.end();
    return;
  }
  if (newRows.length > 0) {
    console.log(`  ATENÇÃO: já existe "${NEW}" (R$ ${newRows[0].currentPrice}).`);
    console.log(`  Renomear criaria duplicata. Consolide manualmente.`);
    await client.end();
    return;
  }

  console.log(`  "${OLD}" (R$ ${oldRows[0].currentPrice}) → "${NEW}"`);

  if (!APPLY) {
    console.log("\n  Dry-run. Rode de novo com --apply.");
    await client.end();
    return;
  }

  const r = await client.query(`UPDATE "Material" SET name = $1 WHERE name = $2`, [NEW, OLD]);
  console.log(`  Renomeados: ${r.rowCount}`);

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
