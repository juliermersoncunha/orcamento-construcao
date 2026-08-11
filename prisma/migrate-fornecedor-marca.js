// Cria a tabela Supplier (cadastro simplificado de fornecedor) e adiciona
// Material.brand (marca/fabricante) + Material.supplierId. Idempotente.
//
// Usage:
//   node prisma/migrate-fornecedor-marca.js
//   node prisma/migrate-fornecedor-marca.js "<conn-string>"
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

  await client.query(`
    CREATE TABLE IF NOT EXISTS "Supplier" (
      "id"        TEXT PRIMARY KEY,
      "name"      TEXT NOT NULL,
      "phone"     TEXT,
      "notes"     TEXT,
      "active"    BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('  table "Supplier" ready');

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_name_key" ON "Supplier"("name")
  `);
  console.log('  unique index on Supplier.name ready');

  await client.query(`
    ALTER TABLE "Material"
      ADD COLUMN IF NOT EXISTS "brand"      TEXT,
      ADD COLUMN IF NOT EXISTS "supplierId" TEXT,
      ADD COLUMN IF NOT EXISTS "quantity"   DOUBLE PRECISION
  `);
  console.log('  Material += "brand", "supplierId", "quantity"');

  // FK com ON DELETE SET NULL: apagar um fornecedor não apaga o material.
  const { rows: fk } = await client.query(`
    SELECT 1 FROM pg_constraint WHERE conname = 'Material_supplierId_fkey'
  `);
  if (fk.length === 0) {
    await client.query(`
      ALTER TABLE "Material"
        ADD CONSTRAINT "Material_supplierId_fkey"
        FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    `);
    console.log("  FK Material.supplierId → Supplier.id created");
  } else {
    console.log("  FK Material.supplierId already exists");
  }

  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'Material' AND column_name IN ('brand','supplierId','quantity')
  `);
  const { rows: t } = await client.query(`
    SELECT to_regclass('"Supplier"') AS t
  `);
  console.log("  verify:", rows.length === 3 && t[0].t ? "OK" : "INCOMPLETE");

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
