require("dotenv").config();
const { Client } = require("pg");
const crypto = require("crypto");

function uid() { return crypto.randomUUID().replace(/-/g,"").substring(0,25); }

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_DATABASE_URL });
  await client.connect();
  console.log("Connected.");

  // GlobalPremise
  await client.query(`
    CREATE TABLE IF NOT EXISTS "GlobalPremise" (
      "id"       TEXT NOT NULL,
      "key"      TEXT NOT NULL,
      "label"    TEXT NOT NULL,
      "value"    DOUBLE PRECISION NOT NULL,
      "unit"     TEXT NOT NULL,
      "category" TEXT NOT NULL,
      CONSTRAINT "GlobalPremise_pkey" PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`CREATE UNIQUE INDEX "GlobalPremise_key_key" ON "GlobalPremise"("key")`); } catch {}
  console.log("  GlobalPremise ok");

  // ProjectWall
  await client.query(`
    CREATE TABLE IF NOT EXISTS "ProjectWall" (
      "id"        TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "side"      TEXT NOT NULL,
      "hasWall"   BOOLEAN NOT NULL DEFAULT false,
      "length"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      "height"    DOUBLE PRECISION NOT NULL DEFAULT 2.0,
      CONSTRAINT "ProjectWall_pkey" PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "ProjectWall" ADD CONSTRAINT "ProjectWall_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  ProjectWall ok");

  // IndirectCost
  await client.query(`
    CREATE TABLE IF NOT EXISTS "IndirectCost" (
      "id"        TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "label"     TEXT NOT NULL,
      "category"  TEXT NOT NULL,
      "value"     DOUBLE PRECISION NOT NULL,
      CONSTRAINT "IndirectCost_pkey" PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`ALTER TABLE "IndirectCost" ADD CONSTRAINT "IndirectCost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  IndirectCost ok");

  // ProjectViability
  await client.query(`
    CREATE TABLE IF NOT EXISTS "ProjectViability" (
      "id"         TEXT NOT NULL,
      "projectId"  TEXT NOT NULL,
      "salePrice"  DOUBLE PRECISION NOT NULL DEFAULT 0,
      "bdiPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes"      TEXT,
      "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProjectViability_pkey" PRIMARY KEY ("id")
    )
  `);
  try { await client.query(`CREATE UNIQUE INDEX "ProjectViability_projectId_key" ON "ProjectViability"("projectId")`); } catch {}
  try { await client.query(`ALTER TABLE "ProjectViability" ADD CONSTRAINT "ProjectViability_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE`); } catch {}
  console.log("  ProjectViability ok");

  // Seed GlobalPremise com coeficientes padrão
  const premises = [
    // Alvenaria
    ["alv_bricks_per_m2",       "Tijolos furados por m² de parede",          25,    "un/m²",  "ALVENARIA"],
    ["alv_brick_loss",          "Perda tijolos (%)",                           10,    "%",       "ALVENARIA"],
    ["alv_cement_per_m2",       "Cimento assentamento (sc/m² parede)",         0.07,  "sc/m²",  "ALVENARIA"],
    ["alv_cement_loss",         "Perda cimento assentamento (%)",              5,     "%",       "ALVENARIA"],
    ["alv_sand_per_m2",         "Areia assentamento (m³/m² parede)",          0.01,  "m³/m²",  "ALVENARIA"],
    ["alv_sand_loss",           "Perda areia assentamento (%)",               5,     "%",       "ALVENARIA"],
    // Chapisco
    ["chap_cement_per_m2",      "Chapisco — cimento (sc/m² face)",            0.04,  "sc/m²",  "CHAPISCO"],
    ["chap_sand_per_m2",        "Chapisco — areia grossa (m³/m² face)",       0.006, "m³/m²",  "CHAPISCO"],
    ["chap_loss",               "Perda chapisco (%)",                         5,     "%",       "CHAPISCO"],
    // Reboco interno
    ["reb_int_cement_per_m2",   "Reboco interno — cimento (sc/m²)",           0.08,  "sc/m²",  "REBOCO"],
    ["reb_int_sand_per_m2",     "Reboco interno — areia (m³/m²)",            0.018, "m³/m²",  "REBOCO"],
    ["reb_int_loss",            "Perda reboco interno (%)",                   10,    "%",       "REBOCO"],
    // Reboco externo
    ["reb_ext_cement_per_m2",   "Reboco externo — cimento (sc/m²)",           0.10,  "sc/m²",  "REBOCO"],
    ["reb_ext_sand_per_m2",     "Reboco externo — areia (m³/m²)",            0.024, "m³/m²",  "REBOCO"],
    ["reb_ext_loss",            "Perda reboco externo (%)",                   10,    "%",       "REBOCO"],
    // Estrutura
    ["struct_concrete_per_m2",  "Concreto estrutura (m³/m² construído)",      0.05,  "m³/m²",  "ESTRUTURA"],
    ["struct_steel_per_m3",     "Aço estrutura (kg/m³ concreto)",             80,    "kg/m³",  "ESTRUTURA"],
    ["struct_forms_per_m3",     "Fôrmas estrutura (m²/m³ concreto)",          10,    "m²/m³",  "ESTRUTURA"],
    // Laje
    ["laje_concrete_per_m2",    "Concreto laje (m³/m²)",                      0.12,  "m³/m²",  "LAJE"],
    ["laje_steel_per_m2",       "Aço laje (kg/m²)",                           12,    "kg/m²",  "LAJE"],
    // Fundação
    ["fund_radier_conc",        "Fundação radier — concreto (m³/m²)",         0.10,  "m³/m²",  "FUNDACAO"],
    ["fund_radier_steel",       "Fundação radier — aço (kg/m²)",              60,    "kg/m²",  "FUNDACAO"],
    ["fund_sapata_conc",        "Fundação sapata — concreto (m³/m²)",         0.08,  "m³/m²",  "FUNDACAO"],
    ["fund_sapata_steel",       "Fundação sapata — aço (kg/m²)",              80,    "kg/m²",  "FUNDACAO"],
    ["fund_estaca_conc",        "Fundação estaca — concreto (m³/m²)",         0.10,  "m³/m²",  "FUNDACAO"],
    ["fund_estaca_steel",       "Fundação estaca — aço (kg/m²)",             100,    "kg/m²",  "FUNDACAO"],
    // Cobertura
    ["cob_tile_ceramica",       "Telhas cerâmicas por m² de telhado",         25,    "un/m²",  "COBERTURA"],
    ["cob_tile_fibrocimento",   "Telhas fibrocimento por m² de telhado",      10,    "un/m²",  "COBERTURA"],
    ["cob_tile_metalica",       "Telhas metálicas por m² de telhado",          8,    "un/m²",  "COBERTURA"],
    ["cob_tile_loss",           "Perda telhas (%)",                           10,    "%",       "COBERTURA"],
    ["cob_caibro_per_m2",       "Caibros por m² de telhado (m)",              3.5,   "m/m²",   "COBERTURA"],
    ["cob_ripa_per_m2",         "Ripas por m² de telhado (m)",                6.0,   "m/m²",   "COBERTURA"],
    ["cob_beirado",             "Fator beirado do telhado",                   1.15,  "×",       "COBERTURA"],
    // Revestimentos
    ["rev_arg_ceramica",        "Argamassa piso cerâmico (sc/m²)",            0.286, "sc/m²",  "REVESTIMENTOS"],
    ["rev_arg_porcelanato",     "Argamassa porcelanato (sc/m²)",              0.40,  "sc/m²",  "REVESTIMENTOS"],
    ["rev_rejunte",             "Rejunte (kg/m²)",                            0.40,  "kg/m²",  "REVESTIMENTOS"],
    ["rev_floor_loss",          "Perda piso/azulejo (%)",                     10,    "%",       "REVESTIMENTOS"],
    ["rev_arg_loss",            "Perda argamassa (%)",                        6,     "%",       "REVESTIMENTOS"],
    // Pintura
    ["pin_massa_per_m2",        "Massa corrida (balde 20kg/m² parede)",       1.0,   "bl/m²",  "PINTURA"],
    ["pin_tinta_per_m2",        "Tinta PVA (L/m² por demão)",                0.214, "L/m²",   "PINTURA"],
    ["pin_demaos",              "Número de demãos de tinta",                   2,    "demãos",  "PINTURA"],
    ["pin_loss",                "Perda pintura/massa (%)",                    8,     "%",       "PINTURA"],
    // Instalações
    ["elet_pontos_per_m2",      "Pontos elétricos por m² de área",           0.22,  "pts/m²", "INSTALACOES"],
    ["elet_conduite_per_pt",    "Conduíte por ponto elétrico (m)",            3.0,   "m/pt",   "INSTALACOES"],
    ["elet_fio_per_pt",         "Fio 2,5mm² por ponto elétrico (m)",          4.0,   "m/pt",   "INSTALACOES"],
    ["hidro_pontos_per_ban",    "Pontos hidráulicos por banheiro/cômodo mol.",4,     "pts",    "INSTALACOES"],
    ["hidro_agua_per_pt",       "Tubo água fria por ponto (m)",               5.0,   "m/pt",   "INSTALACOES"],
    ["hidro_esgoto_per_pt",     "Tubo esgoto por ponto (m)",                  4.0,   "m/pt",   "INSTALACOES"],
    // Muro
    ["muro_bricks_per_m2",      "Tijolos por m² de muro",                    25,    "un/m²",  "MURO"],
    ["muro_cement_per_m2",      "Cimento muro — assentamento (sc/m²)",       0.07,  "sc/m²",  "MURO"],
    ["muro_sand_per_m2",        "Areia muro — assentamento (m³/m²)",         0.01,  "m³/m²",  "MURO"],
    ["muro_loss",               "Perda muro (%)",                             10,    "%",       "MURO"],
    // Terraplenagem
    ["terra_soil_per_m2",       "Movimentação de terra (m³/m²)",              0.30,  "m³/m²",  "TERRAPLENAGEM"],
  ];

  let created = 0, skipped = 0;
  const now = new Date().toISOString();
  for (const [key, label, value, unit, category] of premises) {
    const { rows } = await client.query(`SELECT id FROM "GlobalPremise" WHERE key = $1`, [key]);
    if (rows.length === 0) {
      await client.query(
        `INSERT INTO "GlobalPremise" (id, key, label, value, unit, category) VALUES ($1,$2,$3,$4,$5,$6)`,
        [uid(), key, label, value, unit, category]
      );
      created++;
    } else {
      skipped++;
    }
  }
  console.log(`  GlobalPremise: ${created} inseridas, ${skipped} já existiam.`);

  await client.end();
  console.log("Migration complete.");
}

main().catch(e => { console.error(e); process.exit(1); });
