// Adds the fixture/room-type infrastructure for the "Equipamentos por ambiente" feature.
// - Room.roomType (nullable, with backfill by name)
// - New tables: Fixture, RoomWallFinish, RoomImpermeabilization, RoomJoinery, Accessory,
//   HydraulicPointDetail, ElectricalPointDetail
// - New enum values in MaterialCategory
//
// Usage:
//   node prisma/migrate-fixtures.js
//   node prisma/migrate-fixtures.js "<conn-string>"
require("dotenv").config();
const { Client } = require("pg");

const connectionString = process.argv[2] || process.env.DIRECT_DATABASE_URL;

async function typeExists(client, name) {
  const { rows } = await client.query(
    `SELECT 1 FROM pg_type WHERE typname = $1`,
    [name]
  );
  return rows.length > 0;
}

async function enumHasValue(client, typeName, value) {
  const { rows } = await client.query(
    `SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = $1 AND e.enumlabel = $2`,
    [typeName, value]
  );
  return rows.length > 0;
}

async function ensureEnum(client, name, values) {
  if (!(await typeExists(client, name))) {
    const list = values.map((v) => `'${v}'`).join(", ");
    await client.query(`CREATE TYPE "${name}" AS ENUM (${list})`);
    console.log(`  CREATED enum: ${name}`);
  } else {
    for (const v of values) {
      if (!(await enumHasValue(client, name, v))) {
        // ALTER TYPE ... ADD VALUE must be run outside a transaction; use IF NOT EXISTS
        await client.query(`ALTER TYPE "${name}" ADD VALUE IF NOT EXISTS '${v}'`);
        console.log(`    + ${name}.${v}`);
      }
    }
  }
}

async function main() {
  if (!connectionString) throw new Error("No connection string (arg or DIRECT_DATABASE_URL)");

  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  await client.connect();
  console.log("Connected to database");

  // ── 1. Extend MaterialCategory ─────────────────────────────────────────────
  await ensureEnum(client, "MaterialCategory", [
    "TERRAPLENAGEM", "FUNDACAO", "LAJE", "PINTURA", "ACABAMENTO",
    "ESTRUTURA", "ALVENARIA", "COBERTURA", "ELETRICA", "HIDRAULICA",
    "REVESTIMENTO", "ESQUADRIA", "OUTROS",
    "LOUCAS_SANITARIAS", "METAIS_SANITARIOS", "ACESSORIOS_HIDRAULICOS",
    "IMPERMEABILIZACAO", "VIDROS_BOX", "ACESSORIOS_BANHEIRO",
  ]);

  // ── 2. New enums ──────────────────────────────────────────────────────────
  await ensureEnum(client, "RoomType", [
    "BANHEIRO", "LAVABO", "BANHEIRO_SUITE", "BANHEIRO_SERVICO",
    "COZINHA", "AREA_SERVICO", "QUARTO", "SUITE",
    "SALA_ESTAR", "SALA_JANTAR", "GARAGEM", "VARANDA",
    "ESCRITORIO", "CIRCULACAO", "OUTRO",
  ]);
  await ensureEnum(client, "FixtureType", [
    "VASO_CAIXA_ACOPLADA", "VASO_VALVULA",
    "LAVATORIO_SUSPENSO", "LAVATORIO_COLUNA",
    "CUBA_APOIO", "CUBA_EMBUTIR", "CUBA_SOBREPOR",
    "GABINETE_CUBA", "BANCADA_CUBA",
    "CHUVEIRO_ELETRICO", "DUCHA_FRIA", "DUCHA_QUENTE", "DUCHA_SOLAR", "DUCHA_GAS",
    "CAIXA_SIFONADA", "RALO_SIFONADO", "RALO_SECO", "RALO_LINEAR",
    "DUCHA_HIGIENICA", "BOX_FRONTAL", "BOX_CANTO",
    "EXAUSTOR", "TORNEIRA_ELETRICA",
  ]);
  await ensureEnum(client, "HydraulicPointType", [
    "AGUA_FRIA", "AGUA_QUENTE", "ESGOTO_40", "ESGOTO_50", "ESGOTO_100", "RALO",
  ]);
  await ensureEnum(client, "ElectricalPointType", [
    "TOMADA", "INTERRUPTOR", "PONTO_LUZ", "CIRCUITO_EXCLUSIVO",
  ]);
  await ensureEnum(client, "JoineryType", [
    "PORTA_INTERNA", "PORTA_EXTERNA", "JANELA",
  ]);
  await ensureEnum(client, "ImpermScope", [
    "NENHUM", "BOX", "PISO", "PISO_PAREDES", "CUSTOM",
  ]);

  // ── 3. Room.roomType ──────────────────────────────────────────────────────
  await client.query(`ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "roomType" "RoomType"`);
  console.log(`  Room += "roomType"`);

  // Backfill by name (only where null)
  const backfills = [
    { pattern: '%lavabo%',                                         value: 'LAVABO' },
    { pattern: '%banheiro%su%te%',                                 value: 'BANHEIRO_SUITE' },
    { pattern: '%wc%su%te%',                                       value: 'BANHEIRO_SUITE' },
    { pattern: '%banheiro%servi%o%',                               value: 'BANHEIRO_SERVICO' },
    { pattern: '%banheiro%',                                       value: 'BANHEIRO' },
    { pattern: '%wc%',                                             value: 'BANHEIRO' },
    { pattern: '%cozinha%',                                        value: 'COZINHA' },
    { pattern: '%%rea de servi%o%',                                value: 'AREA_SERVICO' },
    { pattern: '%lavanderia%',                                     value: 'AREA_SERVICO' },
    { pattern: '%su%te%',                                          value: 'SUITE' },
    { pattern: '%quarto%',                                         value: 'QUARTO' },
    { pattern: '%sala de estar%',                                  value: 'SALA_ESTAR' },
    { pattern: '%sala de jantar%',                                 value: 'SALA_JANTAR' },
    { pattern: '%sala%',                                           value: 'SALA_ESTAR' },
    { pattern: '%garagem%',                                        value: 'GARAGEM' },
    { pattern: '%varanda%',                                        value: 'VARANDA' },
    { pattern: '%escrit%rio%',                                     value: 'ESCRITORIO' },
    { pattern: '%circula%',                                        value: 'CIRCULACAO' },
  ];
  for (const b of backfills) {
    const { rowCount } = await client.query(
      `UPDATE "Room" SET "roomType" = $1::"RoomType" WHERE "roomType" IS NULL AND LOWER("name") ILIKE $2`,
      [b.value, b.pattern]
    );
    if (rowCount > 0) console.log(`    ${b.value}: ${rowCount} row(s) backfilled`);
  }

  // ── 4. New tables ─────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Fixture" (
      "id" TEXT PRIMARY KEY,
      "roomId" TEXT NOT NULL,
      "fixtureType" "FixtureType" NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "exclusionGroup" TEXT,
      "configJson" TEXT,
      "includedComponents" TEXT[] NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Fixture_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "Fixture_roomId_idx" ON "Fixture"("roomId")`);
  console.log(`  Fixture table ready`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "RoomWallFinish" (
      "id" TEXT PRIMARY KEY,
      "roomId" TEXT NOT NULL,
      "wallSide" TEXT NOT NULL,
      "hasTile" BOOLEAN NOT NULL DEFAULT false,
      "tileHeight" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
      CONSTRAINT "RoomWallFinish_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "RoomWallFinish_roomId_idx" ON "RoomWallFinish"("roomId")`);
  console.log(`  RoomWallFinish table ready`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "RoomImpermeabilization" (
      "id" TEXT PRIMARY KEY,
      "roomId" TEXT NOT NULL UNIQUE,
      "scope" "ImpermScope" NOT NULL DEFAULT 'NENHUM',
      "area" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "wallHeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "ralos" INTEGER NOT NULL DEFAULT 0,
      "tubulacoes" INTEGER NOT NULL DEFAULT 0,
      "system" TEXT NOT NULL DEFAULT 'argamassa_polimerica',
      "coats" INTEGER NOT NULL DEFAULT 3,
      "mechProtection" BOOLEAN NOT NULL DEFAULT false,
      CONSTRAINT "RoomImpermeabilization_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  console.log(`  RoomImpermeabilization table ready`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "RoomJoinery" (
      "id" TEXT PRIMARY KEY,
      "roomId" TEXT NOT NULL,
      "joineryType" "JoineryType" NOT NULL,
      "subtype" TEXT NOT NULL DEFAULT 'comum',
      "width" DOUBLE PRECISION NOT NULL DEFAULT 0.80,
      "height" DOUBLE PRECISION NOT NULL DEFAULT 2.10,
      "material" TEXT NOT NULL DEFAULT 'madeira',
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "prefinished" BOOLEAN NOT NULL DEFAULT false,
      "includedComponents" TEXT[] NOT NULL DEFAULT '{}',
      CONSTRAINT "RoomJoinery_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "RoomJoinery_roomId_idx" ON "RoomJoinery"("roomId")`);
  console.log(`  RoomJoinery table ready`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "Accessory" (
      "id" TEXT PRIMARY KEY,
      "roomId" TEXT NOT NULL,
      "accessoryType" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      CONSTRAINT "Accessory_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "Accessory_roomId_idx" ON "Accessory"("roomId")`);
  console.log(`  Accessory table ready`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "HydraulicPointDetail" (
      "id" TEXT PRIMARY KEY,
      "hydraulicPointId" TEXT NOT NULL,
      "type" "HydraulicPointType" NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "sourceFixtureId" TEXT,
      CONSTRAINT "HydraulicPointDetail_hydraulicPointId_fkey" FOREIGN KEY ("hydraulicPointId") REFERENCES "HydraulicPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "HydraulicPointDetail_hydraulicPointId_idx" ON "HydraulicPointDetail"("hydraulicPointId")`);
  console.log(`  HydraulicPointDetail table ready`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "ElectricalPointDetail" (
      "id" TEXT PRIMARY KEY,
      "electricalPointId" TEXT NOT NULL,
      "type" "ElectricalPointType" NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "sourceFixtureId" TEXT,
      CONSTRAINT "ElectricalPointDetail_electricalPointId_fkey" FOREIGN KEY ("electricalPointId") REFERENCES "ElectricalPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "ElectricalPointDetail_electricalPointId_idx" ON "ElectricalPointDetail"("electricalPointId")`);
  console.log(`  ElectricalPointDetail table ready`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const { rows: withType } = await client.query(
    `SELECT "roomType", COUNT(*)::int AS n FROM "Room" WHERE "roomType" IS NOT NULL GROUP BY "roomType" ORDER BY "roomType"`
  );
  const { rows: without } = await client.query(
    `SELECT COUNT(*)::int AS n FROM "Room" WHERE "roomType" IS NULL`
  );
  console.log("\nRoom.roomType distribution:");
  for (const r of withType) console.log(`  ${r.roomType}: ${r.n}`);
  console.log(`  <untyped>: ${without[0].n}`);

  await client.end();
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
