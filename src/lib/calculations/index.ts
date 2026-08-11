export type RoomInput = {
  name: string;
  roomType?: string | null;
  width: number;
  length: number;
  height: number;
  floorType?: string;
  wallTile?: boolean;
  wallTileHeight?: number;
  paintWalls?: boolean;
  electricalOutlets?: number;
  electricalSwitches?: number;
  electricalLightPoints?: number;
  hydraulicWaterInlets?: number;
  hydraulicDrainPoints?: number;
  // When true, the generic wall-tile calc skips this room — its wall tile is
  // computed per-wall by the fixture engine (bathroom custom wall finish).
  skipWallTile?: boolean;
};

export type StructureInput = {
  foundationType: string;
  structureType: string;
  blockType: string;
  floors: number;
  hasLaje: boolean;
  hasEscada: boolean;
  pilarMetros: number;
  pilarLargura: number;
  pilarAltura: number;
  vigaMetros: number;
  vigaLargura: number;
  vigaAltura: number;
  sapataQtd: number;
  sapataLargura: number;
  sapataCompr: number;
  escavacaoM3: number;
  compactacaoM2: number;
  sapataAltura: number;
  perimetroParedesExt: number;
  perimetroParedesInt: number;
  peDireito: number;
  hasPlatibanda: boolean;
  platibandaML: number;
  platibandaAltura: number;
  lajeType: string;   // "forro" | "piso"
  formasM2: number;   // fôrmas de madeira manual; 0 = calcula automático
  radierEspessura: number;
  radierArea: number;
};

export type RoofingInput = {
  roofType: string;
  tileType: string;
  inclination: number;
  hasRoof: boolean;
  tileSize?: string | null;   // fibrocimento: "2,44 x 1,1" | "1,83 x 1,1"
  caibroM?: number;           // madeiramento manual; 0 = calcula automático
  ripaM?: number;
};

import { ELECTRICAL_FINISH_DEFAULTS, outletMaterialsPerPoint, switchMaterialsPerPoint, lightPointMaterialsPerPoint } from "./electrical-finishes";
import type { ElectricalFinishes } from "./electrical-finishes";
import {
  isBathroomRoom,
  ARGAMASSA_PAREDE_BANHEIRO,
  ARGAMASSA_PAREDE_GERAL,
} from "../room-classification";

export type FinishesInput = {
  doors: number;
  windows: number;
  externalDoors: number;
  // Acabamento antes da pintura. Default MCMV: só reboco + tinta.
  wallFinishType?: "SO_TINTA" | "MASSA_TINTA" | "GESSO_TINTA";
};

export type CalculationInput = {
  rooms: RoomInput[];
  structure: StructureInput;
  roofing: RoofingInput;
  finishes: FinishesInput;
  heatingType: string;
  electrical?: ElectricalFinishes;
};

export type MaterialResult = {
  name: string;
  unit: string;
  quantity: number;
  phase: string;
  category: string;
};

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function totalFloorArea(rooms: RoomInput[]) {
  return rooms.reduce((sum, r) => sum + r.width * r.length, 0);
}

function round1(n: number) {
  return Math.ceil(n * 10) / 10;
}

// Traço 1:2:3 — materiais por m³ de concreto feito na obra
const TRACO_123 = {
  cimentoSc: 8,    // sacos de 50kg
  areiaM3: 0.56,   // m³
  britaM3: 0.84,   // m³
};

function concretoTraco123(volumeM3: number, phase: string, category: string): MaterialResult[] {
  if (volumeM3 <= 0) return [];
  return [
    { name: "Cimento CP-II (50kg)", unit: "sc", quantity: Math.ceil(volumeM3 * TRACO_123.cimentoSc), phase, category },
    { name: "Areia Média", unit: "m³", quantity: round1(volumeM3 * TRACO_123.areiaM3), phase, category },
    { name: "Brita 1", unit: "m³", quantity: round1(volumeM3 * TRACO_123.britaM3), phase, category },
  ];
}

// Traço 1:2:3 rende ~0,140 m³ de concreto pronto por saco de cimento 50kg
// (35 L cimento + 70 L areia + 105 L brita → 140 L de concreto). Usado onde o
// volume de concreto já é conhecido (laje) e precisa ser convertido em insumos.
const CONCRETO_YIELD_M3 = 0.140;
const CONCRETO_AREIA_POR_SACO = 0.070;  // m³ de areia por saco
const CONCRETO_BRITA_POR_SACO = 0.105;  // m³ de brita por saco
function concretoPorRendimento(volumeM3: number, phase: string, category: string): MaterialResult[] {
  if (volumeM3 <= 0) return [];
  const sacos = volumeM3 / CONCRETO_YIELD_M3;
  return [
    { name: "Cimento CP-II (50kg)", unit: "sc", quantity: Math.ceil(sacos), phase, category },
    { name: "Areia Média", unit: "m³", quantity: round1(sacos * CONCRETO_AREIA_POR_SACO), phase, category },
    { name: "Brita 1", unit: "m³", quantity: round1(sacos * CONCRETO_BRITA_POR_SACO), phase, category },
  ];
}

// ── Terraplenagem (manual) ─────────────────────────────────────────────────
function calcTerraplenagem(structure: StructureInput): MaterialResult[] {
  const results: MaterialResult[] = [];
  if (structure.escavacaoM3 > 0) {
    results.push({ name: "Escavação e Terraplenagem", unit: "m³", quantity: round1(structure.escavacaoM3), phase: "TERRAPLENAGEM", category: "TERRAPLENAGEM" });
  }
  if (structure.compactacaoM2 > 0) {
    results.push({ name: "Compactação de Aterro", unit: "m²", quantity: Math.ceil(structure.compactacaoM2), phase: "TERRAPLENAGEM", category: "TERRAPLENAGEM" });
  }
  return results;
}

// ── Fundação (radier ou sapatas) ──────────────────────────────────────────
function calcFundacao(structure: StructureInput): MaterialResult[] {
  // Radier: laje de fundação. Volume = área × espessura, concreto no traço 1:2:3
  // (mesmo rendimento da laje: 0,140 m³/saco).
  if (structure.foundationType === "radier") {
    const volRadier = structure.radierArea * structure.radierEspessura;
    if (volRadier <= 0) return [];
    return concretoPorRendimento(volRadier, "FUNDACAO", "FUNDACAO");
  }

  const vol = structure.sapataQtd * structure.sapataLargura * structure.sapataCompr * structure.sapataAltura;
  if (vol <= 0) return [];

  // Fôrmas de madeira são 100% manuais (calcFormasManual) — aqui só sai concreto
  // e armação da sapata.
  return [
    ...concretoTraco123(vol, "FUNDACAO", "FUNDACAO"),
    { name: "Armação de Sapata", unit: "un", quantity: structure.sapataQtd, phase: "FUNDACAO", category: "FUNDACAO" },
  ];
}

// ── Estrutura (pilares + vigas) ───────────────────────────────────────────
function calcEstrutura(structure: StructureInput): MaterialResult[] {
  const volPilar = structure.pilarMetros * structure.pilarLargura * structure.pilarAltura;
  const volViga = structure.vigaMetros * structure.vigaLargura * structure.vigaAltura;
  const volTotal = volPilar + volViga;

  if (volTotal <= 0) return [];

  const results: MaterialResult[] = [
    ...concretoTraco123(volTotal, "ESTRUTURA_ALVENARIA", "ESTRUTURA"),
  ];
  if (structure.pilarMetros > 0) {
    results.push({ name: "Armação de Pilar", unit: "m", quantity: round1(structure.pilarMetros), phase: "ESTRUTURA_ALVENARIA", category: "ESTRUTURA" });
  }
  if (structure.vigaMetros > 0) {
    results.push({ name: "Armação de Viga", unit: "m", quantity: round1(structure.vigaMetros), phase: "ESTRUTURA_ALVENARIA", category: "ESTRUTURA" });
  }
  // Fôrmas de madeira são 100% manuais (calcFormasManual).

  return results;
}

function calcAlvenaria(
  finishes: FinishesInput,
  structure: StructureInput
): MaterialResult[] {
  // Perímetros informados manualmente na Etapa 3 — parede externa + interna,
  // sem duplicar (cada parede interna entra uma vez). A platibanda é uma faixa
  // adicional de alvenaria acima do pé-direito, no perímetro externo.
  const perimTotal = structure.perimetroParedesExt + structure.perimetroParedesInt;
  const platibandaArea = structure.hasPlatibanda
    ? structure.platibandaML * structure.platibandaAltura
    : 0;
  const wallArea = perimTotal * structure.peDireito * structure.floors + platibandaArea;

  const areaVaos =
    (finishes.doors + finishes.externalDoors) * 0.9 * 2.1 +
    finishes.windows * 1.2 * 1.2;
  const netWallArea = Math.max(wallArea - areaVaos, 0);

  const brickPerM2 = structure.blockType === "bloco_concreto" ? 12 : 25;
  const bricks = Math.ceil(netWallArea * brickPerM2 * 1.10);

  const cimentoAssentamento = Math.ceil(netWallArea * 0.07 * 1.05);
  const areiaAssentamento = round1(netWallArea * 0.01 * 1.05);

  const chapiscoArea = netWallArea * 2;
  const cimentoChapisco = Math.ceil(chapiscoArea * 0.04 * 1.05);
  const areiaChapisco = round1(chapiscoArea * 0.006 * 1.05);

  const cimentoRebrocoInt = Math.ceil(netWallArea * 0.08 * 1.10);
  const areiaRebrocoInt = round1(netWallArea * 0.018 * 1.10);

  const externalWallArea =
    structure.perimetroParedesExt * structure.peDireito * structure.floors + platibandaArea;
  const cimentoRebrocoExt = Math.ceil(externalWallArea * 0.10 * 1.10);
  const areiaRebrocoExt = round1(externalWallArea * 0.024 * 1.10);

  const brickName = structure.blockType === "bloco_concreto"
    ? "Bloco de Concreto"
    : structure.blockType === "bloco_celular"
    ? "Bloco de Concreto Celular"
    : "Tijolo Cerâmico Furado 9x19x19";

  return [
    { name: brickName, unit: "un", quantity: bricks, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Cimento CP-II (50kg)", unit: "sc", quantity: cimentoAssentamento, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Areia Média", unit: "m³", quantity: areiaAssentamento, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Cimento CP-II (50kg)", unit: "sc", quantity: cimentoChapisco, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Areia Grossa", unit: "m³", quantity: areiaChapisco, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Cimento CP-II (50kg)", unit: "sc", quantity: cimentoRebrocoInt, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Areia Fina", unit: "m³", quantity: areiaRebrocoInt, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Cimento CP-II (50kg)", unit: "sc", quantity: cimentoRebrocoExt, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Areia Fina", unit: "m³", quantity: areiaRebrocoExt, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
  ];
}

// ── Laje pré-moldada ──────────────────────────────────────────────────────
function calcLaje(rooms: RoomInput[], structure: StructureInput): MaterialResult[] {
  if (!structure.hasLaje) return [];

  const area = totalFloorArea(rooms) * (structure.floors - 1 || 1);
  // Concreto pronto por m² conforme o tipo de laje:
  // forro = 0,048 m³/m² (48 L) · piso = 0,058 m³/m² (58 L).
  const coefConcreto = structure.lajeType === "piso" ? 0.058 : 0.048;
  const concreteVol = round1(area * coefConcreto);

  return [
    { name: "Laje pré-moldada treliçada", unit: "m²", quantity: Math.ceil(area), phase: "LAJE", category: "LAJE" },
    ...concretoPorRendimento(concreteVol, "LAJE", "LAJE"),
  ];
}

// ── Escada ─────────────────────────────────────────────────────────────────
function calcEscada(structure: StructureInput): MaterialResult[] {
  if (!structure.hasEscada || structure.floors < 2) return [];

  const lances = structure.floors - 1;
  const vol = 2 * lances;
  // Fôrmas de madeira são 100% manuais (calcFormasManual).
  return concretoTraco123(vol, "ESCADA", "ESTRUTURA");
}

// ── Fôrmas de madeira (manual) ─────────────────────────────────────────────
function calcFormasManual(structure: StructureInput): MaterialResult[] {
  if (structure.formasM2 <= 0) return [];
  return [
    { name: "Fôrmas de Madeira (compensado 18mm)", unit: "m²", quantity: Math.ceil(structure.formasM2), phase: "ESTRUTURA_ALVENARIA", category: "ESTRUTURA" },
  ];
}

// ── Cobertura ──────────────────────────────────────────────────────────────

// Telhas grandes (fibrocimento) são dimensionadas pela área ÚTIL da peça — a área
// nominal menos os recobrimentos lateral e longitudinal, que são sobreposição e não
// cobrem telhado. Telhas pequenas (cerâmica) são vendidas por consumo em peças/m².
//
// Fibrocimento ondulada: largura nominal 1,10 m, recobrimento lateral de 1/4 de onda
// (~5 cm). O recobrimento longitudinal cresce quando a inclinação é baixa, porque a
// água escorre mais devagar e sobe por capilaridade na emenda.
const FIBROCIMENTO_LARGURA = 1.10;
const FIBROCIMENTO_RECOBR_LATERAL = 0.05;
const FIBROCIMENTO_COMPRIMENTOS: Record<string, number> = {
  "2,44 x 1,1": 2.44,
  "1,83 x 1,1": 1.83,
};
const FIBROCIMENTO_TAMANHO_PADRAO = "2,44 x 1,1";

// Consumo em peças por m² de telhado, e o nome exato do material no catálogo.
export function tileConsumption(roofing: RoofingInput): { name: string; perM2: number } {
  if (roofing.tileType === "fibrocimento") {
    const size = roofing.tileSize && FIBROCIMENTO_COMPRIMENTOS[roofing.tileSize]
      ? roofing.tileSize
      : FIBROCIMENTO_TAMANHO_PADRAO;
    const comprimento = FIBROCIMENTO_COMPRIMENTOS[size];
    // Abaixo de 15° o fabricante exige recobrimento longitudinal maior.
    const recobrLongitudinal = roofing.inclination >= 15 ? 0.14 : 0.20;
    const areaUtil =
      (comprimento - recobrLongitudinal) * (FIBROCIMENTO_LARGURA - FIBROCIMENTO_RECOBR_LATERAL);
    return { name: `Telha de Fibrocimento ${size}`, perM2: 1 / areaUtil };
  }
  if (roofing.tileType === "ceramica") {
    return { name: "Telha Cerâmica", perM2: 25 };
  }
  return { name: "Telha Metálica", perM2: 8 };
}

function calcCobertura(rooms: RoomInput[], roofing: RoofingInput): MaterialResult[] {
  if (!roofing.hasRoof || roofing.roofType === "laje_impermeabilizada") {
    const area = totalFloorArea(rooms);
    return [
      { name: "Impermeabilizante Acrílico", unit: "L", quantity: Math.ceil(area * 0.5), phase: "COBERTURA", category: "COBERTURA" },
    ];
  }

  const floorArea = totalFloorArea(rooms);
  const inclRad = toRadians(roofing.inclination);
  const roofArea = round1((floorArea / Math.cos(inclRad)) * 1.15);
  const LOSS = 1.10;

  const { name: tileName, perM2 } = tileConsumption(roofing);

  const tiles = Math.ceil(roofArea * perM2 * LOSS);
  const ridgePieces = Math.ceil(roofArea * 0.15);

  const results: MaterialResult[] = [
    { name: tileName, unit: "un", quantity: tiles, phase: "COBERTURA", category: "COBERTURA" },
  ];
  // Madeiramento é 100% manual — só entra o que o usuário informar na Etapa 4.
  const caibros = Math.ceil(roofing.caibroM ?? 0);
  const ripas = Math.ceil(roofing.ripaM ?? 0);
  if (caibros > 0) {
    results.push({ name: "Caibro 5x7cm (pinus)", unit: "m", quantity: caibros, phase: "COBERTURA", category: "COBERTURA" });
  }
  if (ripas > 0) {
    results.push({ name: "Ripa 2,5x5cm (pinus)", unit: "m", quantity: ripas, phase: "COBERTURA", category: "COBERTURA" });
  }
  results.push({ name: "Cumeeira", unit: "un", quantity: ridgePieces, phase: "COBERTURA", category: "COBERTURA" });

  return results;
}

// ── Instalações Elétricas ──────────────────────────────────────────────────
function calcEletrica(
  rooms: RoomInput[],
  electrical: ElectricalFinishes = ELECTRICAL_FINISH_DEFAULTS
): MaterialResult[] {
  // Cabo, eletroduto, caixa, quadro e disjuntor NÃO são estimados — vêm da
  // entrada manual em "Etapa 5 › Cabos e infraestrutura elétrica". Aqui só
  // saem os acabamentos dos pontos que o usuário declarou por ambiente.
  const declared = rooms.reduce((acc, r) => ({
    outlets: acc.outlets + (r.electricalOutlets ?? 0),
    switches: acc.switches + (r.electricalSwitches ?? 0),
    lightPoints: acc.lightPoints + (r.electricalLightPoints ?? 0),
  }), { outlets: 0, switches: 0, lightPoints: 0 });

  const items: MaterialResult[] = [];
  if (declared.outlets > 0) {
    const m = outletMaterialsPerPoint(electrical.outletType);
    items.push({ name: m.name, unit: m.unit, quantity: declared.outlets * m.qty, phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" });
  }
  if (declared.switches > 0) {
    const m = switchMaterialsPerPoint(electrical.switchType);
    items.push({ name: m.name, unit: m.unit, quantity: declared.switches * m.qty, phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" });
  }
  if (declared.lightPoints > 0) {
    for (const m of lightPointMaterialsPerPoint(electrical.lightPointType)) {
      items.push({ name: m.name, unit: m.unit, quantity: declared.lightPoints * m.qty, phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" });
    }
  }

  return items;
}

// ── Instalações Hidrossanitárias ──────────────────────────────────────────
// Tubos e conexões NÃO são estimados. O usuário informa manualmente as
// quantidades em "Etapa 5 › Tubos e conexões", e essas linhas entram no
// orçamento como ManualBudgetItem. Aqui só ficam os itens de infraestrutura
// do projeto todo — reservatório, esgoto sanitário e o box genérico dos
// banheiros que não foram detalhados na biblioteca de equipamentos.
function calcHidrossanitaria(rooms: RoomInput[]): MaterialResult[] {
  const wetRooms = rooms.filter((r) => (r.hydraulicDrainPoints ?? 0) > 0 || (r.hydraulicWaterInlets ?? 0) > 0);
  if (wetRooms.length === 0) return [];

  // Box de banheiro NÃO entra aqui — é item opcional por ambiente, marcado no
  // card do banheiro (fixtureType BOX_FRONTAL) na Etapa 5.
  return [
    { name: "Caixa d'Água 1000L", unit: "un", quantity: 1, phase: "INSTALACOES_HIDROSSANITARIAS", category: "HIDRAULICA" },
    { name: "Fossa Séptica", unit: "un", quantity: 1, phase: "INSTALACOES_HIDROSSANITARIAS", category: "HIDRAULICA" },
  ];
}

// ── Revestimentos (piso e azulejo) ─────────────────────────────────────────
function calcRevestimentos(rooms: RoomInput[]): MaterialResult[] {
  const results: MaterialResult[] = [];
  let ceramicFloor = 0;
  let porcelainFloor = 0;
  // Azulejo de parede separado por ambiente: banheiro usa AC-III (área
  // molhada), os demais usam AC-I. O revestimento e o rejunte são os mesmos.
  let bathWallTile = 0;
  let otherWallTile = 0;

  for (const room of rooms) {
    const floorArea = room.width * room.length;
    if (room.floorType === "porcelanato") {
      porcelainFloor += floorArea;
    } else if (room.floorType !== "madeira" && room.floorType !== "cimento") {
      ceramicFloor += floorArea;
    }

    const perimeter = 2 * (room.width + room.length);
    if (room.wallTile && !room.skipWallTile) {
      const a = perimeter * (room.wallTileHeight ?? 1.5);
      if (isBathroomRoom(room.roomType, room.name)) bathWallTile += a;
      else otherWallTile += a;
    }
  }

  const wallTileArea = bathWallTile + otherWallTile;

  const LOSS_FLOOR = 1.10;
  const LOSS_TILE = 1.10;
  const LOSS_ARG = 1.06;

  if (ceramicFloor > 0) {
    const area = Math.ceil(ceramicFloor * LOSS_FLOOR);
    results.push({ name: "Piso Cerâmico", unit: "m²", quantity: area, phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    results.push({ name: "Argamassa AC-II (assentamento piso)", unit: "sc", quantity: Math.ceil(ceramicFloor * 0.286 * LOSS_ARG), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    results.push({ name: "Rejunte", unit: "kg", quantity: Math.ceil(ceramicFloor * 0.4 * LOSS_ARG), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
  }
  if (porcelainFloor > 0) {
    const area = Math.ceil(porcelainFloor * LOSS_FLOOR);
    results.push({ name: "Piso Porcelanato", unit: "m²", quantity: area, phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    results.push({ name: "Argamassa AC-III", unit: "sc", quantity: Math.ceil(porcelainFloor * 0.4 * LOSS_ARG), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    results.push({ name: "Rejunte", unit: "kg", quantity: Math.ceil(porcelainFloor * 0.4 * LOSS_ARG), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
  }
  if (wallTileArea > 0) {
    const area = Math.ceil(wallTileArea * LOSS_TILE);
    results.push({ name: "Revestimento Cerâmico (parede)", unit: "m²", quantity: area, phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    if (bathWallTile > 0) {
      results.push({ name: ARGAMASSA_PAREDE_BANHEIRO, unit: "sc", quantity: Math.ceil(bathWallTile * 0.45), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    }
    if (otherWallTile > 0) {
      results.push({ name: ARGAMASSA_PAREDE_GERAL, unit: "sc", quantity: Math.ceil(otherWallTile * 0.45), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    }
    results.push({ name: "Rejunte", unit: "kg", quantity: Math.ceil(wallTileArea * 0.4 * LOSS_ARG), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
  }

  return results;
}

// ── Pintura ────────────────────────────────────────────────────────────────
// Consumos (por m² por demão, com perdas típicas):
//   Tinta acrílica standard: 1/12 L/m², duas demãos, perda 8%   → 0,18 L/m²
//   Selador acrílico:        0,10 L/m², uma demão               → 0,10 L/m²
//   Massa corrida:           0,70 kg/m², duas demãos, perda 6%  → 1,48 kg/m²
//   Gesso liso:              1,20 kg/m², uma demão, perda 5%    → 1,26 kg/m²
//
// Padrão MCMV é "SO_TINTA" — reboco + tinta direto. Massa e gesso são opções
// de acabamento superior, escolhidas em ProjectFinishes.wallFinishType.
function calcPintura(rooms: RoomInput[], finish: FinishesInput["wallFinishType"] = "SO_TINTA"): MaterialResult[] {
  let paintWallArea = 0;

  for (const room of rooms) {
    if (room.paintWalls === false) continue;
    const perimeter = 2 * (room.width + room.length);
    const tileH = room.wallTile ? (room.wallTileHeight ?? 1.5) : 0;
    paintWallArea += perimeter * (room.height - tileH);
  }

  if (paintWallArea <= 0) return [];

  const items: MaterialResult[] = [];

  if (finish === "MASSA_TINTA") {
    items.push({
      name: "Massa corrida", unit: "kg", category: "PINTURA", phase: "PINTURA",
      quantity: Math.ceil(paintWallArea * 1.48),
    });
    items.push({
      name: "Lixa para massa", unit: "un", category: "PINTURA", phase: "PINTURA",
      quantity: Math.ceil(paintWallArea * 0.2), // ~1 folha a cada 5 m²
    });
  } else if (finish === "GESSO_TINTA") {
    items.push({
      name: "Gesso liso", unit: "kg", category: "PINTURA", phase: "PINTURA",
      quantity: Math.ceil(paintWallArea * 1.26),
    });
    items.push({
      name: "Lixa para massa", unit: "un", category: "PINTURA", phase: "PINTURA",
      quantity: Math.ceil(paintWallArea * 0.2),
    });
  }

  items.push({
    name: "Selador acrílico", unit: "L", category: "PINTURA", phase: "PINTURA",
    quantity: Math.ceil(paintWallArea * 0.10),
  });
  items.push({
    name: "Tinta Acrílica Fosca", unit: "L", category: "PINTURA", phase: "PINTURA",
    quantity: Math.ceil(paintWallArea * 0.18),
  });

  return items;
}

// ── Acabamento (Esquadrias) ────────────────────────────────────────────────
function calcAcabamento(finishes: FinishesInput): MaterialResult[] {
  const results: MaterialResult[] = [];

  if (finishes.externalDoors > 0) {
    results.push({ name: "Porta Externa (painel/madeira)", unit: "un", quantity: finishes.externalDoors, phase: "ACABAMENTO", category: "ESQUADRIA" });
  }
  if (finishes.doors > 0) {
    results.push({ name: "Porta Interna (madeira)", unit: "un", quantity: finishes.doors, phase: "ACABAMENTO", category: "ESQUADRIA" });
  }
  if (finishes.windows > 0) {
    results.push({ name: "Janela (alumínio)", unit: "un", quantity: finishes.windows, phase: "ACABAMENTO", category: "ESQUADRIA" });
  }

  const totalDoors = finishes.doors + finishes.externalDoors;
  if (totalDoors > 0) {
    // Uma soleira por vão. O batente dos ambientes detalhados (banheiro) vem da
    // biblioteca de equipamentos, com o marco e a ferragem próprios daquela porta.
    results.push({ name: "Soleira de Porta", unit: "un", quantity: totalDoors, phase: "ACABAMENTO", category: "ESQUADRIA" });
    results.push({ name: "Fechadura Completa", unit: "un", quantity: totalDoors, phase: "ACABAMENTO", category: "ESQUADRIA" });
  }

  return results;
}

// ── Função principal ───────────────────────────────────────────────────────
export function calculateMaterials(input: CalculationInput): MaterialResult[] {
  return [
    ...calcTerraplenagem(input.structure),
    ...calcFundacao(input.structure),
    ...calcEstrutura(input.structure),
    ...calcFormasManual(input.structure),
    ...calcAlvenaria(input.finishes, input.structure),
    ...calcLaje(input.rooms, input.structure),
    ...calcEscada(input.structure),
    ...calcCobertura(input.rooms, input.roofing),
    ...calcEletrica(input.rooms, input.electrical ?? ELECTRICAL_FINISH_DEFAULTS),
    ...calcHidrossanitaria(input.rooms),
    ...calcRevestimentos(input.rooms),
    ...calcPintura(input.rooms, input.finishes.wallFinishType),
    ...calcAcabamento(input.finishes),
  ];
}
