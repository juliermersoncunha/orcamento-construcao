// Situacao do item do passo a passo (pendente / em andamento / concluido).
// Idempotente. Usage: node prisma/migrate-passo-status.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`ALTER TABLE "ScheduleTask" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDENTE'`);
  // Quem ja estava marcado como feito vira CONCLUIDA.
  const r = await c.query(`UPDATE "ScheduleTask" SET "status"='CONCLUIDA' WHERE "done" = true AND "status" <> 'CONCLUIDA'`);
  console.log("status OK · itens concluidos migrados:", r.rowCount);
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
