export type RoomInput = {
  name: string;
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
  sapataAltura: number;
};

export type RoofingInput = {
  roofType: string;
  tileType: string;
  inclination: number;
  hasRoof: boolean;
  tileSize?: string | null;   // fibrocimento: "2,44 x 1,1" | "1,83 x 1,1"
};

import { ELECTRICAL_FINISH_DEFAULTS, outletMaterialsPerPoint, switchMaterialsPerPoint, lightPointMaterialsPerPoint } from "./electrical-finishes";
import type { ElectricalFinishes } from "./electrical-finishes";

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

function totalWallArea(rooms: RoomInput[]) {
  return rooms.reduce((sum, r) => {
    const perimeter = 2 * (r.width + r.length);
    return sum + perimeter * r.height;
  }, 0);
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

// ── Terraplenagem ──────────────────────────────────────────────────────────
function calcTerraplenagem(rooms: RoomInput[], structure: StructureInput): MaterialResult[] {
  const area = totalFloorArea(rooms);
  const soilVolume = round1(area * 0.30 * structure.floors);

  return [
    { name: "Escavação e Terraplenagem", unit: "m³", quantity: soilVolume, phase: "TERRAPLENAGEM", category: "TERRAPLENAGEM" },
    { name: "Compactação de Aterro", unit: "m²", quantity: Math.ceil(area), phase: "TERRAPLENAGEM", category: "TERRAPLENAGEM" },
  ];
}

// ── Fundação (sapatas) ────────────────────────────────────────────────────
function calcFundacao(structure: StructureInput): MaterialResult[] {
  const vol = structure.sapataQtd * structure.sapataLargura * structure.sapataCompr * structure.sapataAltura;
  if (vol <= 0) return [];

  const results: MaterialResult[] = [
    ...concretoTraco123(vol, "FUNDACAO", "FUNDACAO"),
    { name: "Armação de Sapata", unit: "un", quantity: structure.sapataQtd, phase: "FUNDACAO", category: "FUNDACAO" },
    { name: "Fôrmas de Madeira (compensado 18mm)", unit: "m²", quantity: Math.ceil(vol * 10), phase: "FUNDACAO", category: "FUNDACAO" },
  ];

  return results;
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
  results.push({ name: "Fôrmas de Madeira (compensado 18mm)", unit: "m²", quantity: Math.ceil(volTotal * 10), phase: "ESTRUTURA_ALVENARIA", category: "ESTRUTURA" });

  return results;
}

function calcAlvenaria(
  rooms: RoomInput[],
  finishes: FinishesInput,
  structure: StructureInput
): MaterialResult[] {
  const wallArea = totalWallArea(rooms) * structure.floors;
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

  const externalWallArea = netWallArea * 0.30;
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
  // Laje pré-moldada/treliçada: concreto 0,065 m³/m² (referência forro/cobertura)
  const concreteVol = round1(area * 0.065);

  return [
    { name: "Laje pré-moldada treliçada", unit: "m²", quantity: Math.ceil(area), phase: "LAJE", category: "LAJE" },
    ...concretoTraco123(concreteVol, "LAJE", "LAJE"),
  ];
}

// ── Escada ─────────────────────────────────────────────────────────────────
function calcEscada(structure: StructureInput): MaterialResult[] {
  if (!structure.hasEscada || structure.floors < 2) return [];

  const lances = structure.floors - 1;
  const vol = 2 * lances;
  return [
    ...concretoTraco123(vol, "ESCADA", "ESTRUTURA"),
    { name: "Fôrmas de Madeira (compensado 18mm)", unit: "m²", quantity: 15 * lances, phase: "ESCADA", category: "ESTRUTURA" },
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
function tileConsumption(roofing: RoofingInput): { name: string; perM2: number } {
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
  const caibros = Math.ceil(roofArea * 3.5);
  const ripas = Math.ceil(roofArea * 6);
  const ridgePieces = Math.ceil(roofArea * 0.15);

  return [
    { name: tileName, unit: "un", quantity: tiles, phase: "COBERTURA", category: "COBERTURA" },
    { name: "Caibro 5x7cm (pinus)", unit: "m", quantity: caibros, phase: "COBERTURA", category: "COBERTURA" },
    { name: "Ripa 2,5x5cm (pinus)", unit: "m", quantity: ripas, phase: "COBERTURA", category: "COBERTURA" },
    { name: "Cumeeira", unit: "un", quantity: ridgePieces, phase: "COBERTURA", category: "COBERTURA" },
  ];
}

// ── Instalações Elétricas ──────────────────────────────────────────────────
function calcEletrica(
  rooms: RoomInput[],
  electrical: ElectricalFinishes = ELECTRICAL_FINISH_DEFAULTS
): MaterialResult[] {
  // Prioriza pontos declarados por ambiente; cai para estimativa por área
  // só se ninguém declarou (compatibilidade com projetos antigos).
  const declared = rooms.reduce((acc, r) => ({
    outlets: acc.outlets + (r.electricalOutlets ?? 0),
    switches: acc.switches + (r.electricalSwitches ?? 0),
    lightPoints: acc.lightPoints + (r.electricalLightPoints ?? 0),
  }), { outlets: 0, switches: 0, lightPoints: 0 });
  const declaredTotal = declared.outlets + declared.switches + declared.lightPoints;

  const totalPoints = declaredTotal > 0
    ? declaredTotal
    : Math.ceil(totalFloorArea(rooms) * 0.22);

  if (totalPoints === 0) return [];

  const items: MaterialResult[] = [
    { name: "Conduíte Corrugado 3/4\" (flexível)", unit: "m", quantity: Math.ceil(totalPoints * 3), phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" },
    { name: "Fio Flexível 2,5mm²", unit: "m", quantity: Math.ceil(totalPoints * 4), phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" },
    { name: "Caixa de Passagem 4x4/4x2", unit: "un", quantity: totalPoints, phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" },
    { name: "Quadro de Distribuição", unit: "un", quantity: 1, phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" },
    { name: "Disjuntor/DR", unit: "un", quantity: Math.ceil(totalPoints / 8) + 1, phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" },
  ];

  // Acabamentos: só quando o usuário declarou os pontos (o cálculo por área
  // não distingue tomada/interruptor/luz — seria arbitrário).
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
  let wallTileArea = 0;

  for (const room of rooms) {
    const floorArea = room.width * room.length;
    if (room.floorType === "porcelanato") {
      porcelainFloor += floorArea;
    } else if (room.floorType !== "madeira" && room.floorType !== "cimento") {
      ceramicFloor += floorArea;
    }

    const perimeter = 2 * (room.width + room.length);
    if (room.wallTile && !room.skipWallTile) {
      wallTileArea += perimeter * (room.wallTileHeight ?? 1.5);
    }
  }

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
    results.push({ name: "Argamassa AC-III (assentamento porcelanato)", unit: "sc", quantity: Math.ceil(porcelainFloor * 0.4 * LOSS_ARG), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    results.push({ name: "Rejunte", unit: "kg", quantity: Math.ceil(porcelainFloor * 0.4 * LOSS_ARG), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
  }
  if (wallTileArea > 0) {
    const area = Math.ceil(wallTileArea * LOSS_TILE);
    results.push({ name: "Revestimento Cerâmico (parede)", unit: "m²", quantity: area, phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    results.push({ name: "Argamassa AC-I (assentamento azulejo)", unit: "sc", quantity: Math.ceil(wallTileArea * 0.45), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
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
    ...calcTerraplenagem(input.rooms, input.structure),
    ...calcFundacao(input.structure),
    ...calcEstrutura(input.structure),
    ...calcAlvenaria(input.rooms, input.finishes, input.structure),
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
