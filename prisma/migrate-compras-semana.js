// Leva a marcacao "ja comprado" da etapa para a semana da programacao.
//
// Uma etapa marcada como comprada vira compra marcada em cada semana onde a
// etapa esta — mas so na linha cujo material vem APENAS dessa etapa. Se outra
// etapa da mesma semana tambem usa o material, a linha soma as duas e marcar
// diria que a parte da outra tambem foi comprada; essas ficam de fora e sao
// listadas. Idempotente.
//
// Usage: node prisma/migrate-compras-semana.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const { randomUUID } = require("crypto");
const connectionString = process.argv[2] || process.env.DATABASE_URL;

async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS "ScheduleWeekPurchase" (
      "id"         TEXT PRIMARY KEY,
      "projectId"  TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
      "materialId" TEXT NOT NULL REFERENCES "Material"("id"),
      "weekStart"  TIMESTAMP(3) NOT NULL
    )`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleWeekPurchase_projectId_weekStart_materialId_key" ON "ScheduleWeekPurchase"("projectId","weekStart","materialId")`);
  console.log("tabela ScheduleWeekPurchase OK");

  // (semana, material) → etapas que contribuem
  const contrib = (await c.query(`
    SELECT w."projectId", w."weekStart", sm."materialId", sm."stageId", sm.purchased
      FROM "ScheduleWeekStage" w
      JOIN "ScheduleStageMaterial" sm ON sm."stageId" = w."stageId"`)).rows;

  const grupos = new Map();
  for (const r of contrib) {
    const k = `${r.projectId}|${r.weekStart.toISOString()}|${r.materialId}`;
    const g = grupos.get(k) ?? { ...r, etapas: [] };
    g.etapas.push({ stageId: r.stageId, purchased: r.purchased });
    grupos.set(k, g);
  }

  let marcados = 0;
  const mistos = [];
  for (const g of grupos.values()) {
    const algumComprado = g.etapas.some((e) => e.purchased);
    if (!algumComprado) continue;
    if (g.etapas.every((e) => e.purchased)) {
      const r = await c.query(
        `INSERT INTO "ScheduleWeekPurchase" ("id","projectId","materialId","weekStart")
         VALUES ($1,$2,$3,$4) ON CONFLICT ("projectId","weekStart","materialId") DO NOTHING`,
        [randomUUID(), g.projectId, g.materialId, g.weekStart]
      );
      marcados += r.rowCount;
    } else {
      mistos.push(g);
    }
  }
  console.log("compras levadas para a semana:", marcados);
  if (mistos.length) {
    const nomes = (await c.query(`SELECT id, name FROM "Material" WHERE id = ANY($1)`, [mistos.map((m) => m.materialId)])).rows;
    const nome = new Map(nomes.map((n) => [n.id, n.name]));
    console.log("deixadas sem marcar (linha soma etapa comprada com etapa nao comprada):");
    for (const m of mistos) console.log("  ", m.weekStart.toISOString().slice(0, 10), nome.get(m.materialId));
  }
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
