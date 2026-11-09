// Revisões do cronograma (R1, R2…). Idempotente.
// Também cria a R1 dos projetos que já têm parada registrada, com a
// programação de hoje — é o plano que a parada produziu.
// Usage: node prisma/migrate-schedule-revision.js "<conn-string>"
require("dotenv").config({ quiet: true });
const { Client } = require("pg");
const { randomUUID } = require("crypto");
const connectionString = process.argv[2] || process.env.DATABASE_URL;

const iso = (d) => d.toISOString().slice(0, 10);
const meioDia = (s) => `${s}T15:00:00`;
const mais4 = (s) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 4);
  return iso(d);
};

async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS "ScheduleRevision" (
      "id"        TEXT         NOT NULL PRIMARY KEY,
      "projectId" TEXT         NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "number"    INTEGER      NOT NULL,
      "reason"    TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleRevision_projectId_number_key"
    ON "ScheduleRevision"("projectId", "number")`);
  await c.query(`
    CREATE TABLE IF NOT EXISTS "ScheduleRevisionStage" (
      "id"         TEXT         NOT NULL PRIMARY KEY,
      "revisionId" TEXT         NOT NULL REFERENCES "ScheduleRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "stageId"    TEXT         NOT NULL REFERENCES "ScheduleStage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "start"      TIMESTAMP(3) NOT NULL,
      "end"        TIMESTAMP(3) NOT NULL
    )`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleRevisionStage_revisionId_stageId_key"
    ON "ScheduleRevisionStage"("revisionId", "stageId")`);
  console.log("tabelas OK");

  // R1 para quem já tem parada e ainda não tem revisão nenhuma.
  const { rows: projetos } = await c.query(`
    SELECT DISTINCT p."projectId" AS id FROM "SchedulePause" p
    WHERE NOT EXISTS (SELECT 1 FROM "ScheduleRevision" r WHERE r."projectId" = p."projectId")`);
  for (const { id } of projetos) {
    const { rows: pausas } = await c.query(
      `SELECT reason, "startDate", "endDate" FROM "SchedulePause" WHERE "projectId" = $1 ORDER BY "startDate"`, [id]);
    const motivo = pausas.length === 1
      ? `Parada: ${pausas[0].reason || "sem motivo"} (${iso(pausas[0].startDate).split("-").reverse().join("/")} a ${iso(pausas[0].endDate).split("-").reverse().join("/")})`
      : `${pausas.length} paradas registradas`;
    const { rows: semanas } = await c.query(
      `SELECT "stageId", MIN("weekStart") ini, MAX("weekStart") fim FROM "ScheduleWeekStage" WHERE "projectId" = $1 GROUP BY "stageId"`, [id]);
    if (semanas.length === 0) continue;
    const revId = randomUUID().replace(/-/g, "").slice(0, 25);
    await c.query(`INSERT INTO "ScheduleRevision" (id, "projectId", number, reason) VALUES ($1, $2, 1, $3)`, [revId, id, motivo]);
    for (const s of semanas) {
      await c.query(
        `INSERT INTO "ScheduleRevisionStage" (id, "revisionId", "stageId", start, "end") VALUES ($1, $2, $3, $4, $5)`,
        [randomUUID().replace(/-/g, "").slice(0, 25), revId, s.stageId, meioDia(iso(s.ini)), meioDia(mais4(iso(s.fim)))]);
    }
    console.log(`R1 criada em ${id}: ${motivo} (${semanas.length} etapas)`);
  }
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
