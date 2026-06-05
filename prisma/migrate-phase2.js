require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.env.DIRECT_DATABASE_URL;

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to database");

  // Add new PhaseType values
  const newPhaseTypes = [
    ["TERRAPLENAGEM", "BEFORE 'ESTRUTURA_ALVENARIA'"],
    ["FUNDACAO", "BEFORE 'ESTRUTURA_ALVENARIA'"],
    ["LAJE", "AFTER 'ESTRUTURA_ALVENARIA'"],
    ["INSTALACOES_HIDROSSANITARIAS", "AFTER 'INSTALACOES_ELETRICAS'"],
    ["ESCADA", "AFTER 'LAJE'"],
    ["PINTURA", "AFTER 'REVESTIMENTOS'"],
    ["ACABAMENTO", "AFTER 'PINTURA'"],
    ["OUTROS", "AFTER 'COBERTURA'"],
  ];

  for (const [value, position] of newPhaseTypes) {
    try {
      await client.query(`ALTER TYPE "PhaseType" ADD VALUE IF NOT EXISTS '${value}' ${position}`);
      console.log(`  PhaseType += ${value}`);
    } catch (e) {
      console.log(`  PhaseType ${value}: ${e.message}`);
    }
  }

  // Create LaborModel enum if not exists
  try {
    await client.query(`CREATE TYPE "LaborModel" AS ENUM ('FIXED', 'PER_M2', 'PERCENT')`);
    console.log("  Created LaborModel enum");
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.log("  LaborModel enum already exists");
    } else {
      console.log(`  LaborModel: ${e.message}`);
    }
  }

  // Add new MaterialCategory values
  const newMatCategories = ["TERRAPLENAGEM", "FUNDACAO", "LAJE", "PINTURA", "ACABAMENTO"];
  for (const value of newMatCategories) {
    try {
      await client.query(`ALTER TYPE "MaterialCategory" ADD VALUE IF NOT EXISTS '${value}'`);
      console.log(`  MaterialCategory += ${value}`);
    } catch (e) {
      console.log(`  MaterialCategory ${value}: ${e.message}`);
    }
  }

  // Add columns to ProjectStructure
  try {
    await client.query(`ALTER TABLE "ProjectStructure" ADD COLUMN IF NOT EXISTS "hasLaje" BOOLEAN NOT NULL DEFAULT false`);
    console.log("  ProjectStructure.hasLaje added");
  } catch (e) {
    console.log(`  hasLaje: ${e.message}`);
  }
  try {
    await client.query(`ALTER TABLE "ProjectStructure" ADD COLUMN IF NOT EXISTS "hasEscada" BOOLEAN NOT NULL DEFAULT false`);
    console.log("  ProjectStructure.hasEscada added");
  } catch (e) {
    console.log(`  hasEscada: ${e.message}`);
  }

  // Create LaborConfig table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "LaborConfig" (
      "id"        TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "model"     "LaborModel" NOT NULL DEFAULT 'PERCENT',
      CONSTRAINT "LaborConfig_pkey" PRIMARY KEY ("id")
    )
  `);
  console.log("  LaborConfig table ready");

  try {
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "LaborConfig_projectId_key" ON "LaborConfig"("projectId")`);
  } catch (e) { /* already exists */ }

  try {
    await client.query(`ALTER TABLE "LaborConfig" ADD CONSTRAINT "LaborConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
  } catch (e) { /* already exists */ }

  // Create LaborPhase table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "LaborPhase" (
      "id"            TEXT NOT NULL,
      "laborConfigId" TEXT NOT NULL,
      "phase"         "PhaseType" NOT NULL,
      "value"         DOUBLE PRECISION NOT NULL,
      CONSTRAINT "LaborPhase_pkey" PRIMARY KEY ("id")
    )
  `);
  console.log("  LaborPhase table ready");

  try {
    await client.query(`ALTER TABLE "LaborPhase" ADD CONSTRAINT "LaborPhase_laborConfigId_fkey" FOREIGN KEY ("laborConfigId") REFERENCES "LaborConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
  } catch (e) { /* already exists */ }

  // Create CashFlowEntry table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "CashFlowEntry" (
      "id"        TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "phase"     "PhaseType" NOT NULL,
      "month"     INTEGER NOT NULL,
      "percent"   DOUBLE PRECISION NOT NULL,
      CONSTRAINT "CashFlowEntry_pkey" PRIMARY KEY ("id")
    )
  `);
  console.log("  CashFlowEntry table ready");

  try {
    await client.query(`ALTER TABLE "CashFlowEntry" ADD CONSTRAINT "CashFlowEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
  } catch (e) { /* already exists */ }

  await client.end();
  console.log("\nMigration complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
