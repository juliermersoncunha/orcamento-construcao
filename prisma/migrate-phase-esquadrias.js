// Fase "Esquadrias" (portas, janelas, portões e ferragens), separada de
// Acabamento. Idempotente.
// Usage: node prisma/migrate-phase-esquadrias.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;

async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();

  // ADD VALUE não pode rodar dentro de transação junto com o uso do valor.
  await c.query(`ALTER TYPE "PhaseType" ADD VALUE IF NOT EXISTS 'ESQUADRIAS' BEFORE 'ACABAMENTO'`);
  console.log("PhaseType.ESQUADRIAS OK");

  // Itens já lançados: o que é esquadria pela categoria do catálogo, mais
  // portões (cadastrados em "Outros").
  for (const tabela of ["ManualBudgetItem", "BudgetItem"]) {
    const r = await c.query(`
      UPDATE "${tabela}" b SET phase = 'ESQUADRIAS'
      FROM "Material" m
      WHERE m.id = b."materialId" AND b.phase = 'ACABAMENTO'
        AND (m.category = 'ESQUADRIA' OR m.name ILIKE 'port_o%')`);
    console.log(`${tabela}: ${r.rowCount} item(ns) movidos para Esquadrias`);
  }
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
