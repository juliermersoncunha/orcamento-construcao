// Cria a tabela ManualBudgetItem — linhas hidrossanitárias que o usuário
// informa manualmente (tubos e conexões). O sistema não estima essas
// quantidades; a tabela só armazena o que o usuário digitou.
//
// Idempotente. Segura para projetos existentes: nada é apagado.
//
// Usage:
//   node prisma/migrate-manual-budget.js
//   node prisma/migrate-manual-budget.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DIRECT_DATABASE_URL;

async function main() {
  if (!connectionString) throw new Error("No connection string (arg or DIRECT_DATABASE_URL)");
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  console.log("Connected to database");

  await client.query(`
    CREATE TABLE IF NOT EXISTS "ManualBudgetItem" (
      "id"         TEXT PRIMARY KEY,
      "projectId"  TEXT NOT NULL,
      "materialId" TEXT NOT NULL,
      "quantity"   DOUBLE PRECISION NOT NULL DEFAULT 0,
      CONSTRAINT "ManualBudgetItem_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
      CONSTRAINT "ManualBudgetItem_materialId_fkey"
        FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE,
      CONSTRAINT "ManualBudgetItem_projectId_materialId_key"
        UNIQUE ("projectId", "materialId")
    )
  `);
  console.log('  CREATE TABLE "ManualBudgetItem" OK');

  await client.query(`
    CREATE INDEX IF NOT EXISTS "ManualBudgetItem_projectId_idx"
      ON "ManualBudgetItem"("projectId")
  `);
  console.log('  CREATE INDEX projectId OK');

  const { rows } = await client.query(`
    SELECT COUNT(*)::int AS c FROM information_schema.tables
    WHERE table_name = 'ManualBudgetItem'
  `);
  console.log("  verify:", rows[0].c === 1 ? "OK" : "NOT FOUND");

  await client.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
