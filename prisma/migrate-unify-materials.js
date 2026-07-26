// Unifies duplicate materials: removes suffixes like "– assentamento", "– chapisco",
// "– reboco externo", "– reboco interno" so each material has a single entry/price.
// Also merges "Tijolo furado 9×19×19" into "Tijolo Cerâmico Furado 9x19x19".
//
// Usage:
//   node prisma/migrate-unify-materials.js                 -> uses DIRECT_DATABASE_URL
//   node prisma/migrate-unify-materials.js "<conn-string>" -> explicit target
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DIRECT_DATABASE_URL;

const MERGE_MAP = {
  "Cimento CP-II (50kg) – assentamento": "Cimento CP-II (50kg)",
  "Cimento CP-II (50kg) – chapisco": "Cimento CP-II (50kg)",
  "Cimento CP-II (50kg) – reboco externo": "Cimento CP-II (50kg)",
  "Cimento CP-II (50kg) – reboco interno": "Cimento CP-II (50kg)",
  "Cimento CP-II (50kg) – concreto": "Cimento CP-II (50kg)",
  "Areia Fina – reboco externo": "Areia Fina",
  "Areia Fina – reboco interno": "Areia Fina",
  "Areia Grossa – chapisco": "Areia Grossa",
  "Areia Média – assentamento": "Areia Média",
  "Areia Média – concreto": "Areia Média",
  "Brita 1 – concreto": "Brita 1",
  "Fôrmas de Madeira – sapatas": "Fôrmas de Madeira (compensado 18mm)",
  "Tijolo furado 9×19×19": "Tijolo Cerâmico Furado 9x19x19",
  "Cimento CP-II": "Cimento CP-II (50kg)",
  "Areia grossa": "Areia Grossa",
};

async function main() {
  if (!connectionString) throw new Error("No connection string (arg or DIRECT_DATABASE_URL)");

  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  await client.connect();
  console.log("Connected to database");

  for (const [oldName, newName] of Object.entries(MERGE_MAP)) {
    // Find old material
    const { rows: oldRows } = await client.query(
      `SELECT id, "currentPrice", unit, category FROM "Material" WHERE name = $1`,
      [oldName]
    );
    if (oldRows.length === 0) {
      console.log(`  SKIP: "${oldName}" not found in DB`);
      continue;
    }
    const oldMat = oldRows[0];

    // Find or create the unified material
    let { rows: newRows } = await client.query(
      `SELECT id, "currentPrice" FROM "Material" WHERE name = $1 AND active = true`,
      [newName]
    );

    let newMatId;
    if (newRows.length === 0) {
      // Create the unified material with the old one's price
      const { rows: created } = await client.query(
        `INSERT INTO "Material" (id, name, unit, category, "currentPrice", active, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
         RETURNING id`,
        [newName, oldMat.unit, oldMat.category, oldMat.currentPrice]
      );
      newMatId = created[0].id;
      console.log(`  CREATED: "${newName}" (id=${newMatId}, price=${oldMat.currentPrice})`);
    } else {
      newMatId = newRows[0].id;
      // If unified material has price 0 but old has a price, update it
      if (newRows[0].currentPrice === 0 && oldMat.currentPrice > 0) {
        await client.query(
          `UPDATE "Material" SET "currentPrice" = $1, "updatedAt" = NOW() WHERE id = $2`,
          [oldMat.currentPrice, newMatId]
        );
        console.log(`  UPDATED price: "${newName}" -> ${oldMat.currentPrice}`);
      }
    }

    // Migrate budget items from old material to unified material
    const { rowCount } = await client.query(
      `UPDATE "BudgetItem" SET "materialId" = $1 WHERE "materialId" = $2`,
      [newMatId, oldMat.id]
    );
    console.log(`  MIGRATED: ${rowCount} budget item(s) from "${oldName}" -> "${newName}"`);

    // Deactivate the old material
    await client.query(
      `UPDATE "Material" SET active = false, "updatedAt" = NOW() WHERE id = $1`,
      [oldMat.id]
    );
    console.log(`  DEACTIVATED: "${oldName}" (id=${oldMat.id})`);
  }

  // Summary
  const { rows: remaining } = await client.query(
    `SELECT name, "currentPrice", active FROM "Material" WHERE name LIKE '%–%' AND active = true ORDER BY name`
  );
  if (remaining.length > 0) {
    console.log("\n  WARNING: Still active materials with suffixes:");
    for (const r of remaining) console.log(`    - ${r.name} (R$ ${r.currentPrice})`);
  } else {
    console.log("\n  All suffixed materials deactivated successfully.");
  }

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
