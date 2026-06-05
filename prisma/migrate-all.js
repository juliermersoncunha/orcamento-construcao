// Cria todas as tabelas do sistema do zero (banco vazio)
require("dotenv").config();
const { Client } = require("pg");
const crypto = require("crypto");

function uid() { return crypto.randomUUID().replace(/-/g,"").substring(0,25); }

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Conectado.");

  // ── ENUMS (DO block para compatibilidade com qualquer versão PG) ───────────
  const enums = [
    [`DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('ADMIN','MEMBER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, "Role"],
    [`DO $$ BEGIN CREATE TYPE "ProjectType" AS ENUM ('NOVA_CONSTRUCAO','REFORMA','AMPLIACAO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, "ProjectType"],
    [`DO $$ BEGIN CREATE TYPE "ProjectStatus" AS ENUM ('RASCUNHO','FINALIZADO','ENVIADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, "ProjectStatus"],
    [`DO $$ BEGIN CREATE TYPE "PhaseType" AS ENUM ('TERRAPLENAGEM','FUNDACAO','ESTRUTURA_ALVENARIA','LAJE','INSTALACOES_ELETRICAS','INSTALACOES_HIDROSSANITARIAS','ESCADA','REVESTIMENTOS','PINTURA','COBERTURA','ACABAMENTO','OUTROS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, "PhaseType"],
    [`DO $$ BEGIN CREATE TYPE "LaborModel" AS ENUM ('FIXED','PER_M2','PERCENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, "LaborModel"],
    [`DO $$ BEGIN CREATE TYPE "MaterialCategory" AS ENUM ('TERRAPLENAGEM','FUNDACAO','LAJE','PINTURA','ACABAMENTO','ESTRUTURA','ALVENARIA','COBERTURA','ELETRICA','HIDRAULICA','REVESTIMENTO','ESQUADRIA','OUTROS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`, "MaterialCategory"],
  ];
  for (const [sql, name] of enums) {
    await client.query(sql);
    console.log(`  enum ${name} ok`);
  }

  // ── User ───────────────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id"        TEXT NOT NULL,
      "name"      TEXT NOT NULL,
      "email"     TEXT NOT NULL,
      "password"  TEXT NOT NULL,
      "role"      "Role" NOT NULL DEFAULT 'MEMBER',
      "active"    BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`); } catch {}
  console.log("  User ok");

  // ── Project ────────────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Project" (
      "id"          TEXT NOT NULL,
      "name"        TEXT NOT NULL,
      "clientName"  TEXT NOT NULL,
      "clientPhone" TEXT,
      "clientEmail" TEXT,
      "address"     TEXT,
      "city"        TEXT,
      "state"       TEXT,
      "type"        "ProjectType" NOT NULL,
      "status"      "ProjectStatus" NOT NULL DEFAULT 'RASCUNHO',
      "notes"       TEXT,
      "wizardStep"  INTEGER NOT NULL DEFAULT 1,
      "userId"      TEXT NOT NULL,
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")`); } catch {}
  console.log("  Project ok");

  // ── Room ───────────────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Room" (
      "id"        TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "name"      TEXT NOT NULL,
      "width"     DOUBLE PRECISION NOT NULL,
      "length"    DOUBLE PRECISION NOT NULL,
      "height"    DOUBLE PRECISION NOT NULL DEFAULT 2.8,
      "order"     INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "Room" ADD CONSTRAINT "Room_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  Room ok");

  // ── ProjectStructure ───────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "ProjectStructure" (
      "id"            TEXT NOT NULL,
      "projectId"     TEXT NOT NULL,
      "foundationType" TEXT NOT NULL DEFAULT 'sapata_corrida',
      "structureType"  TEXT NOT NULL DEFAULT 'concreto_armado',
      "blockType"      TEXT NOT NULL DEFAULT 'tijolo_furado',
      "floors"        INTEGER NOT NULL DEFAULT 1,
      "hasLaje"       BOOLEAN NOT NULL DEFAULT false,
      "hasEscada"     BOOLEAN NOT NULL DEFAULT false,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`CREATE UNIQUE INDEX "ProjectStructure_projectId_key" ON "ProjectStructure"("projectId")`); } catch {}
  try { await client.query(`ALTER TABLE "ProjectStructure" ADD CONSTRAINT "ProjectStructure_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  ProjectStructure ok");

  // ── ProjectRoofing ─────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "ProjectRoofing" (
      "id"          TEXT NOT NULL,
      "projectId"   TEXT NOT NULL,
      "roofType"    TEXT NOT NULL DEFAULT 'duas_aguas',
      "tileType"    TEXT NOT NULL DEFAULT 'ceramica',
      "inclination" DOUBLE PRECISION NOT NULL DEFAULT 30,
      "hasRoof"     BOOLEAN NOT NULL DEFAULT true,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`CREATE UNIQUE INDEX "ProjectRoofing_projectId_key" ON "ProjectRoofing"("projectId")`); } catch {}
  try { await client.query(`ALTER TABLE "ProjectRoofing" ADD CONSTRAINT "ProjectRoofing_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  ProjectRoofing ok");

  // ── ProjectInstallations ───────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "ProjectInstallations" (
      "id"          TEXT NOT NULL,
      "projectId"   TEXT NOT NULL,
      "heatingType" TEXT NOT NULL DEFAULT 'eletrico',
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`CREATE UNIQUE INDEX "ProjectInstallations_projectId_key" ON "ProjectInstallations"("projectId")`); } catch {}
  try { await client.query(`ALTER TABLE "ProjectInstallations" ADD CONSTRAINT "ProjectInstallations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  ProjectInstallations ok");

  // ── ElectricalPoint ────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "ElectricalPoint" (
      "id"              TEXT NOT NULL,
      "installationsId" TEXT NOT NULL,
      "roomId"          TEXT NOT NULL,
      "outlets"         INTEGER NOT NULL DEFAULT 2,
      "switches"        INTEGER NOT NULL DEFAULT 1,
      "lightPoints"     INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "ElectricalPoint" ADD CONSTRAINT "ElectricalPoint_installationsId_fkey" FOREIGN KEY ("installationsId") REFERENCES "ProjectInstallations"("id") ON DELETE CASCADE`); } catch {}
  try { await client.query(`ALTER TABLE "ElectricalPoint" ADD CONSTRAINT "ElectricalPoint_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE`); } catch {}
  console.log("  ElectricalPoint ok");

  // ── HydraulicPoint ─────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "HydraulicPoint" (
      "id"              TEXT NOT NULL,
      "installationsId" TEXT NOT NULL,
      "roomId"          TEXT NOT NULL,
      "waterInlets"     INTEGER NOT NULL DEFAULT 0,
      "drainPoints"     INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "HydraulicPoint" ADD CONSTRAINT "HydraulicPoint_installationsId_fkey" FOREIGN KEY ("installationsId") REFERENCES "ProjectInstallations"("id") ON DELETE CASCADE`); } catch {}
  try { await client.query(`ALTER TABLE "HydraulicPoint" ADD CONSTRAINT "HydraulicPoint_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE`); } catch {}
  console.log("  HydraulicPoint ok");

  // ── ProjectFinishes ────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "ProjectFinishes" (
      "id"            TEXT NOT NULL,
      "projectId"     TEXT NOT NULL,
      "doors"         INTEGER NOT NULL DEFAULT 0,
      "windows"       INTEGER NOT NULL DEFAULT 0,
      "externalDoors" INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`CREATE UNIQUE INDEX "ProjectFinishes_projectId_key" ON "ProjectFinishes"("projectId")`); } catch {}
  try { await client.query(`ALTER TABLE "ProjectFinishes" ADD CONSTRAINT "ProjectFinishes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  ProjectFinishes ok");

  // ── RoomFinish ─────────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "RoomFinish" (
      "id"            TEXT NOT NULL,
      "finishesId"    TEXT NOT NULL,
      "roomId"        TEXT NOT NULL,
      "floorType"     TEXT NOT NULL DEFAULT 'ceramica',
      "wallTile"      BOOLEAN NOT NULL DEFAULT false,
      "wallTileHeight" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
      "paintWalls"    BOOLEAN NOT NULL DEFAULT true,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "RoomFinish" ADD CONSTRAINT "RoomFinish_finishesId_fkey" FOREIGN KEY ("finishesId") REFERENCES "ProjectFinishes"("id") ON DELETE CASCADE`); } catch {}
  try { await client.query(`ALTER TABLE "RoomFinish" ADD CONSTRAINT "RoomFinish_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE`); } catch {}
  console.log("  RoomFinish ok");

  // ── Material ───────────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Material" (
      "id"           TEXT NOT NULL,
      "name"         TEXT NOT NULL,
      "unit"         TEXT NOT NULL,
      "category"     "MaterialCategory" NOT NULL,
      "currentPrice" DOUBLE PRECISION NOT NULL,
      "active"       BOOLEAN NOT NULL DEFAULT true,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )
  `);
  console.log("  Material ok");

  // ── PriceHistory ───────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "PriceHistory" (
      "id"         TEXT NOT NULL,
      "materialId" TEXT NOT NULL,
      "price"      DOUBLE PRECISION NOT NULL,
      "changedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "changedBy"  TEXT NOT NULL,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id")`); } catch {}
  try { await client.query(`ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id")`); } catch {}
  console.log("  PriceHistory ok");

  // ── BudgetItem ─────────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "BudgetItem" (
      "id"                TEXT NOT NULL,
      "projectId"         TEXT NOT NULL,
      "materialId"        TEXT NOT NULL,
      "phase"             "PhaseType" NOT NULL,
      "quantity"          DOUBLE PRECISION NOT NULL,
      "unitPriceSnapshot" DOUBLE PRECISION NOT NULL,
      "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  try { await client.query(`ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id")`); } catch {}
  console.log("  BudgetItem ok");

  // ── LaborConfig ────────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "LaborConfig" (
      "id"        TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "model"     "LaborModel" NOT NULL DEFAULT 'PERCENT',
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`CREATE UNIQUE INDEX "LaborConfig_projectId_key" ON "LaborConfig"("projectId")`); } catch {}
  try { await client.query(`ALTER TABLE "LaborConfig" ADD CONSTRAINT "LaborConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  LaborConfig ok");

  // ── LaborPhase ─────────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "LaborPhase" (
      "id"            TEXT NOT NULL,
      "laborConfigId" TEXT NOT NULL,
      "phase"         "PhaseType" NOT NULL,
      "value"         DOUBLE PRECISION NOT NULL,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "LaborPhase" ADD CONSTRAINT "LaborPhase_laborConfigId_fkey" FOREIGN KEY ("laborConfigId") REFERENCES "LaborConfig"("id") ON DELETE CASCADE`); } catch {}
  console.log("  LaborPhase ok");

  // ── CashFlowEntry ──────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "CashFlowEntry" (
      "id"        TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "phase"     "PhaseType" NOT NULL,
      "month"     INTEGER NOT NULL,
      "percent"   DOUBLE PRECISION NOT NULL,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "CashFlowEntry" ADD CONSTRAINT "CashFlowEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  CashFlowEntry ok");

  // ── GlobalPremise ──────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "GlobalPremise" (
      "id"       TEXT NOT NULL,
      "key"      TEXT NOT NULL,
      "label"    TEXT NOT NULL,
      "value"    DOUBLE PRECISION NOT NULL,
      "unit"     TEXT NOT NULL,
      "category" TEXT NOT NULL,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`CREATE UNIQUE INDEX "GlobalPremise_key_key" ON "GlobalPremise"("key")`); } catch {}
  console.log("  GlobalPremise ok");

  // ── ProjectWall ────────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "ProjectWall" (
      "id"        TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "side"      TEXT NOT NULL,
      "hasWall"   BOOLEAN NOT NULL DEFAULT false,
      "length"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      "height"    DOUBLE PRECISION NOT NULL DEFAULT 2.0,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "ProjectWall" ADD CONSTRAINT "ProjectWall_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  ProjectWall ok");

  // ── IndirectCost ───────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "IndirectCost" (
      "id"        TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "label"     TEXT NOT NULL,
      "category"  TEXT NOT NULL,
      "value"     DOUBLE PRECISION NOT NULL,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "IndirectCost" ADD CONSTRAINT "IndirectCost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  IndirectCost ok");

  // ── ProjectViability (com todos os campos fase 4) ──────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "ProjectViability" (
      "id"                 TEXT NOT NULL,
      "projectId"          TEXT NOT NULL,
      "salePrice"          DOUBLE PRECISION NOT NULL DEFAULT 0,
      "bdiPercent"         DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes"              TEXT,
      "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "landValue"          DOUBLE PRECISION NOT NULL DEFAULT 0,
      "landAppraisalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "itivPercent"        DOUBLE PRECISION NOT NULL DEFAULT 2,
      "landDocPercent"     DOUBLE PRECISION NOT NULL DEFAULT 3.65,
      "hasSale"            BOOLEAN NOT NULL DEFAULT false,
      "venalValue"         DOUBLE PRECISION NOT NULL DEFAULT 0,
      "saleDocPercent"     DOUBLE PRECISION NOT NULL DEFAULT 7.5,
      "brokeragePercent"   DOUBLE PRECISION NOT NULL DEFAULT 5,
      "irPercent"          DOUBLE PRECISION NOT NULL DEFAULT 15,
      PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`CREATE UNIQUE INDEX "ProjectViability_projectId_key" ON "ProjectViability"("projectId")`); } catch {}
  try { await client.query(`ALTER TABLE "ProjectViability" ADD CONSTRAINT "ProjectViability_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  ProjectViability ok");

  // ── GlobalPremise seed ─────────────────────────────────────────────────────
  const premises = [
    ["alv_bricks_per_m2",    "Tijolos furados por m² de parede",         25,    "un/m²",  "ALVENARIA"],
    ["alv_brick_loss",       "Perda tijolos (%)",                         10,    "%",       "ALVENARIA"],
    ["alv_cement_per_m2",    "Cimento assentamento (sc/m² parede)",       0.07,  "sc/m²",  "ALVENARIA"],
    ["alv_cement_loss",      "Perda cimento assentamento (%)",            5,     "%",       "ALVENARIA"],
    ["alv_sand_per_m2",      "Areia assentamento (m³/m² parede)",         0.01,  "m³/m²",  "ALVENARIA"],
    ["alv_sand_loss",        "Perda areia assentamento (%)",              5,     "%",       "ALVENARIA"],
    ["chap_cement_per_m2",   "Chapisco — cimento (sc/m² face)",           0.04,  "sc/m²",  "CHAPISCO"],
    ["chap_sand_per_m2",     "Chapisco — areia grossa (m³/m² face)",      0.006, "m³/m²",  "CHAPISCO"],
    ["chap_loss",            "Perda chapisco (%)",                        5,     "%",       "CHAPISCO"],
    ["reb_int_cement_per_m2","Reboco interno — cimento (sc/m²)",          0.08,  "sc/m²",  "REBOCO"],
    ["reb_int_sand_per_m2",  "Reboco interno — areia (m³/m²)",            0.018, "m³/m²",  "REBOCO"],
    ["reb_int_loss",         "Perda reboco interno (%)",                  10,    "%",       "REBOCO"],
    ["reb_ext_cement_per_m2","Reboco externo — cimento (sc/m²)",          0.10,  "sc/m²",  "REBOCO"],
    ["reb_ext_sand_per_m2",  "Reboco externo — areia (m³/m²)",            0.024, "m³/m²",  "REBOCO"],
    ["reb_ext_loss",         "Perda reboco externo (%)",                  10,    "%",       "REBOCO"],
    ["struct_concrete_per_m2","Concreto estrutura (m³/m² construído)",    0.05,  "m³/m²",  "ESTRUTURA"],
    ["struct_steel_per_m3",  "Aço estrutura (kg/m³ concreto)",            80,    "kg/m³",  "ESTRUTURA"],
    ["struct_forms_per_m3",  "Fôrmas estrutura (m²/m³ concreto)",         10,    "m²/m³",  "ESTRUTURA"],
    ["laje_concrete_per_m2", "Concreto laje (m³/m²)",                     0.12,  "m³/m²",  "LAJE"],
    ["laje_steel_per_m2",    "Aço laje (kg/m²)",                          12,    "kg/m²",  "LAJE"],
    ["fund_radier_conc",     "Fundação radier — concreto (m³/m²)",        0.10,  "m³/m²",  "FUNDACAO"],
    ["fund_radier_steel",    "Fundação radier — aço (kg/m²)",             60,    "kg/m²",  "FUNDACAO"],
    ["fund_sapata_conc",     "Fundação sapata — concreto (m³/m²)",        0.08,  "m³/m²",  "FUNDACAO"],
    ["fund_sapata_steel",    "Fundação sapata — aço (kg/m²)",             80,    "kg/m²",  "FUNDACAO"],
    ["fund_estaca_conc",     "Fundação estaca — concreto (m³/m²)",        0.10,  "m³/m²",  "FUNDACAO"],
    ["fund_estaca_steel",    "Fundação estaca — aço (kg/m²)",            100,    "kg/m²",  "FUNDACAO"],
    ["cob_tile_ceramica",    "Telhas cerâmicas por m² de telhado",        25,    "un/m²",  "COBERTURA"],
    ["cob_tile_fibrocimento","Telhas fibrocimento por m² de telhado",     10,    "un/m²",  "COBERTURA"],
    ["cob_tile_metalica",    "Telhas metálicas por m² de telhado",         8,    "un/m²",  "COBERTURA"],
    ["cob_tile_loss",        "Perda telhas (%)",                          10,    "%",       "COBERTURA"],
    ["cob_caibro_per_m2",    "Caibros por m² de telhado (m)",             3.5,   "m/m²",   "COBERTURA"],
    ["cob_ripa_per_m2",      "Ripas por m² de telhado (m)",               6.0,   "m/m²",   "COBERTURA"],
    ["cob_beirado",          "Fator beirado do telhado",                  1.15,  "×",       "COBERTURA"],
    ["rev_arg_ceramica",     "Argamassa piso cerâmico (sc/m²)",           0.286, "sc/m²",  "REVESTIMENTOS"],
    ["rev_arg_porcelanato",  "Argamassa porcelanato (sc/m²)",             0.40,  "sc/m²",  "REVESTIMENTOS"],
    ["rev_rejunte",          "Rejunte (kg/m²)",                           0.40,  "kg/m²",  "REVESTIMENTOS"],
    ["rev_floor_loss",       "Perda piso/azulejo (%)",                    10,    "%",       "REVESTIMENTOS"],
    ["rev_arg_loss",         "Perda argamassa (%)",                       6,     "%",       "REVESTIMENTOS"],
    ["pin_massa_per_m2",     "Massa corrida (balde 20kg/m² parede)",      1.0,   "bl/m²",  "PINTURA"],
    ["pin_tinta_per_m2",     "Tinta PVA (L/m² por demão)",               0.214, "L/m²",   "PINTURA"],
    ["pin_demaos",           "Número de demãos de tinta",                  2,    "demãos",  "PINTURA"],
    ["pin_loss",             "Perda pintura/massa (%)",                   8,     "%",       "PINTURA"],
    ["elet_pontos_per_m2",   "Pontos elétricos por m² de área",          0.22,  "pts/m²", "INSTALACOES"],
    ["elet_conduite_per_pt", "Conduíte por ponto elétrico (m)",           3.0,   "m/pt",   "INSTALACOES"],
    ["elet_fio_per_pt",      "Fio 2,5mm² por ponto elétrico (m)",         4.0,   "m/pt",   "INSTALACOES"],
    ["hidro_pontos_per_ban", "Pontos hidráulicos por banheiro/cômodo mol.",4,    "pts",    "INSTALACOES"],
    ["hidro_agua_per_pt",    "Tubo água fria por ponto (m)",              5.0,   "m/pt",   "INSTALACOES"],
    ["hidro_esgoto_per_pt",  "Tubo esgoto por ponto (m)",                 4.0,   "m/pt",   "INSTALACOES"],
    ["muro_bricks_per_m2",   "Tijolos por m² de muro",                   25,    "un/m²",  "MURO"],
    ["muro_cement_per_m2",   "Cimento muro — assentamento (sc/m²)",      0.07,  "sc/m²",  "MURO"],
    ["muro_sand_per_m2",     "Areia muro — assentamento (m³/m²)",        0.01,  "m³/m²",  "MURO"],
    ["muro_loss",            "Perda muro (%)",                            10,    "%",       "MURO"],
    ["terra_soil_per_m2",    "Movimentação de terra (m³/m²)",             0.30,  "m³/m²",  "TERRAPLENAGEM"],
  ];

  let created = 0;
  for (const [key, label, value, unit, category] of premises) {
    const { rows } = await client.query(`SELECT id FROM "GlobalPremise" WHERE key=$1`, [key]);
    if (rows.length === 0) {
      await client.query(
        `INSERT INTO "GlobalPremise" (id,key,label,value,unit,category) VALUES ($1,$2,$3,$4,$5,$6)`,
        [uid(), key, label, value, unit, category]
      );
      created++;
    }
  }
  console.log(`  GlobalPremise: ${created} premissas inseridas`);

  await client.end();
  console.log("\nMigração completa! Execute agora: node prisma\\seed.js");
}

main().catch(e => { console.error(e); process.exit(1); });
