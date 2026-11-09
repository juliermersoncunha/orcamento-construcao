// Paradas da obra (suspensões). Idempotente.
// Usage: node prisma/migrate-schedule-pause.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");
const connectionString = process.argv[2] || process.env.DATABASE_URL;
async function main() {
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const c = new Client({ connectionString, ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS "SchedulePause" (
      "id"           TEXT         NOT NULL PRIMARY KEY,
      "projectId"    TEXT         NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "startDate"    TIMESTAMP(3) NOT NULL,
      "endDate"      TIMESTAMP(3) NOT NULL,
      "reason"       TEXT,
      "weeksShifted" INTEGER      NOT NULL DEFAULT 0,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await c.query(`CREATE INDEX IF NOT EXISTS "SchedulePause_projectId_startDate_idx"
    ON "SchedulePause"("projectId", "startDate")`);
  console.log("SchedulePause OK");
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
