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
};

export type StructureInput = {
  foundationType: string;
  structureType: string;
  blockType: string;
  floors: number;
  hasLaje: boolean;
  hasEscada: boolean;
};

export type RoofingInput = {
  roofType: string;
  tileType: string;
  inclination: number;
  hasRoof: boolean;
};

export type FinishesInput = {
  doors: number;
  windows: number;
  externalDoors: number;
};

export type CalculationInput = {
  rooms: RoomInput[];
  structure: StructureInput;
  roofing: RoofingInput;
  finishes: FinishesInput;
  heatingType: string;
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

// ── Terraplenagem ──────────────────────────────────────────────────────────
function calcTerraplenagem(rooms: RoomInput[], structure: StructureInput): MaterialResult[] {
  const area = totalFloorArea(rooms);
  // 0.30 m³/m² de movimentação de terra média
  const soilVolume = round1(area * 0.30 * structure.floors);

  return [
    {
      name: "Escavação e Terraplenagem",
      unit: "m³",
      quantity: soilVolume,
      phase: "TERRAPLENAGEM",
      category: "TERRAPLENAGEM",
    },
    {
      name: "Compactação de Aterro",
      unit: "m²",
      quantity: Math.ceil(area),
      phase: "TERRAPLENAGEM",
      category: "TERRAPLENAGEM",
    },
  ];
}

// ── Fundação ───────────────────────────────────────────────────────────────
function calcFundacao(rooms: RoomInput[], structure: StructureInput): MaterialResult[] {
  const area = totalFloorArea(rooms);

  const coefs: Record<string, { concrete: number; steel: number; forms: number }> = {
    radier:        { concrete: 0.10, steel: 60, forms: 1.5 },
    sapata_corrida: { concrete: 0.08, steel: 80, forms: 0.8 },
    estaca:        { concrete: 0.10, steel: 100, forms: 0.5 },
  };

  const c = coefs[structure.foundationType] ?? coefs.sapata_corrida;
  const concrete = round1(area * c.concrete);
  const steel = Math.ceil(area * c.steel);
  const forms = Math.ceil(area * c.forms);

  return [
    { name: "Concreto Usinado FCK 25 MPa", unit: "m³", quantity: concrete, phase: "FUNDACAO", category: "FUNDACAO" },
    { name: "Aço CA-50 (vergalhão)", unit: "kg", quantity: steel, phase: "FUNDACAO", category: "FUNDACAO" },
    { name: "Fôrmas de Madeira (compensado 18mm)", unit: "m²", quantity: forms, phase: "FUNDACAO", category: "FUNDACAO" },
  ];
}

// ── Estrutura e Alvenaria ──────────────────────────────────────────────────
function calcEstrutura(rooms: RoomInput[], structure: StructureInput): MaterialResult[] {
  const area = totalFloorArea(rooms) * structure.floors;
  // Pilares + vigas: 0.05 m³/m²
  const concrete = round1(area * 0.05);
  const steel = Math.ceil(concrete * 80);
  const forms = Math.ceil(concrete * 10);

  return [
    { name: "Concreto Usinado FCK 25 MPa", unit: "m³", quantity: concrete, phase: "ESTRUTURA_ALVENARIA", category: "ESTRUTURA" },
    { name: "Aço CA-50 (vergalhão)", unit: "kg", quantity: steel, phase: "ESTRUTURA_ALVENARIA", category: "ESTRUTURA" },
    { name: "Fôrmas de Madeira (compensado 18mm)", unit: "m²", quantity: forms, phase: "ESTRUTURA_ALVENARIA", category: "ESTRUTURA" },
  ];
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

  // Tijolos: 25 un/m² com 10% de perda
  const brickPerM2 = structure.blockType === "bloco_concreto" ? 12 : 25;
  const bricks = Math.ceil(netWallArea * brickPerM2 * 1.10);

  // Assentamento: 0.07 sc/m² cimento + 0.01 m³/m² areia + 5% perda
  const cimentoAssentamento = Math.ceil(netWallArea * 0.07 * 1.05);
  const areiaAssentamento = round1(netWallArea * 0.01 * 1.05);

  // Chapisco: 0.04 sc cimento/m² + 0.006 m³ areia grossa/m² + 5%
  // Área de chapisco = ambos os lados da parede
  const chapiscoArea = netWallArea * 2;
  const cimentoChapisco = Math.ceil(chapiscoArea * 0.04 * 1.05);
  const areiaChapisco = round1(chapiscoArea * 0.006 * 1.05);

  // Reboco interno: 0.08 sc/m² + 0.018 m³/m² + 10%
  const cimentoRebrocoInt = Math.ceil(netWallArea * 0.08 * 1.10);
  const areiaRebrocoInt = round1(netWallArea * 0.018 * 1.10);

  // Reboco externo: 0.10 sc/m² + 0.024 m³/m² + 10%
  // Estima área externa = 30% da área de parede total
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
    { name: "Cimento CP-II (50kg) – assentamento", unit: "sc", quantity: cimentoAssentamento, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Areia Média – assentamento", unit: "m³", quantity: areiaAssentamento, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Cimento CP-II (50kg) – chapisco", unit: "sc", quantity: cimentoChapisco, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Areia Grossa – chapisco", unit: "m³", quantity: areiaChapisco, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Cimento CP-II (50kg) – reboco interno", unit: "sc", quantity: cimentoRebrocoInt, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Areia Fina – reboco interno", unit: "m³", quantity: areiaRebrocoInt, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Cimento CP-II (50kg) – reboco externo", unit: "sc", quantity: cimentoRebrocoExt, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
    { name: "Areia Fina – reboco externo", unit: "m³", quantity: areiaRebrocoExt, phase: "ESTRUTURA_ALVENARIA", category: "ALVENARIA" },
  ];
}

// ── Laje ───────────────────────────────────────────────────────────────────
function calcLaje(rooms: RoomInput[], structure: StructureInput): MaterialResult[] {
  if (!structure.hasLaje) return [];

  const area = totalFloorArea(rooms) * (structure.floors - 1 || 1);
  // Laje: concreto 0.12 m³/m², aço 12 kg/m², escoramento 1.0 m²/m²
  const concrete = round1(area * 0.12);
  const steel = Math.ceil(area * 12);
  const escoramento = Math.ceil(area * 1.0);

  return [
    { name: "Concreto Usinado FCK 25 MPa", unit: "m³", quantity: concrete, phase: "LAJE", category: "LAJE" },
    { name: "Aço CA-50 (vergalhão)", unit: "kg", quantity: steel, phase: "LAJE", category: "LAJE" },
    { name: "Escoramento/Fôrma para Laje", unit: "m²", quantity: escoramento, phase: "LAJE", category: "LAJE" },
  ];
}

// ── Escada ─────────────────────────────────────────────────────────────────
function calcEscada(structure: StructureInput): MaterialResult[] {
  if (!structure.hasEscada || structure.floors < 2) return [];

  // Por lance de escada: concreto 2 m³, aço 150 kg, fôrmas 15 m²
  const lances = structure.floors - 1;
  return [
    { name: "Concreto Usinado FCK 25 MPa", unit: "m³", quantity: 2 * lances, phase: "ESCADA", category: "ESTRUTURA" },
    { name: "Aço CA-50 (vergalhão)", unit: "kg", quantity: 150 * lances, phase: "ESCADA", category: "ESTRUTURA" },
    { name: "Fôrmas de Madeira (escada)", unit: "m²", quantity: 15 * lances, phase: "ESCADA", category: "ESTRUTURA" },
  ];
}

// ── Cobertura ──────────────────────────────────────────────────────────────
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

  // Coeficientes calibrados: cerâmica 25 un/m², fibrocimento 10/m², metálica 8/m²
  const tilesCoverage =
    roofing.tileType === "ceramica" ? 25
    : roofing.tileType === "fibrocimento" ? 10
    : 8;

  const tiles = Math.ceil(roofArea * tilesCoverage * LOSS);
  const caibros = Math.ceil(roofArea * 3.5);
  const ripas = Math.ceil(roofArea * 6);
  const ridgePieces = Math.ceil(roofArea * 0.15);

  const tileName =
    roofing.tileType === "ceramica" ? "Telha Cerâmica"
    : roofing.tileType === "fibrocimento" ? "Telha de Fibrocimento"
    : "Telha Metálica";

  return [
    { name: tileName, unit: "un", quantity: tiles, phase: "COBERTURA", category: "COBERTURA" },
    { name: "Caibro 5x7cm (pinus)", unit: "m", quantity: caibros, phase: "COBERTURA", category: "COBERTURA" },
    { name: "Ripa 2,5x5cm (pinus)", unit: "m", quantity: ripas, phase: "COBERTURA", category: "COBERTURA" },
    { name: "Cumeeira", unit: "un", quantity: ridgePieces, phase: "COBERTURA", category: "COBERTURA" },
  ];
}

// ── Instalações Elétricas ──────────────────────────────────────────────────
function calcEletrica(rooms: RoomInput[]): MaterialResult[] {
  const totalFloor = totalFloorArea(rooms);
  // Coeficiente calibrado: 0.22 pontos/m²
  const totalPoints = Math.ceil(totalFloor * 0.22);

  if (totalPoints === 0) return [];

  return [
    { name: "Conduíte Corrugado 3/4\" (flexível)", unit: "m", quantity: Math.ceil(totalPoints * 3), phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" },
    { name: "Fio Flexível 2,5mm² ", unit: "m", quantity: Math.ceil(totalPoints * 4), phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" },
    { name: "Caixa de Passagem 4x4/4x2", unit: "un", quantity: totalPoints, phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" },
    { name: "Quadro de Distribuição", unit: "un", quantity: 1, phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" },
    { name: "Disjuntor/DR", unit: "un", quantity: Math.ceil(totalPoints / 8) + 1, phase: "INSTALACOES_ELETRICAS", category: "ELETRICA" },
  ];
}

// ── Instalações Hidrossanitárias ──────────────────────────────────────────
function calcHidrossanitaria(rooms: RoomInput[]): MaterialResult[] {
  // Contar cômodos molhados (banheiro, cozinha, área de serviço)
  const wetRooms = rooms.filter((r) => (r.hydraulicDrainPoints ?? 0) > 0 || (r.hydraulicWaterInlets ?? 0) > 0);
  // 4 pontos por cômodo molhado
  const totalWaterPoints = wetRooms.length * 4;
  const totalDrainPoints = wetRooms.length * 4;
  const totalPoints = totalWaterPoints + totalDrainPoints;

  if (totalPoints === 0) return [];

  return [
    { name: "Tubo PVC Água Fria 3/4\"", unit: "m", quantity: Math.ceil(totalWaterPoints * 5), phase: "INSTALACOES_HIDROSSANITARIAS", category: "HIDRAULICA" },
    { name: "Tubo PVC Esgoto 100mm", unit: "m", quantity: Math.ceil(totalDrainPoints * 4), phase: "INSTALACOES_HIDROSSANITARIAS", category: "HIDRAULICA" },
    { name: "Conexões e Registros", unit: "un", quantity: Math.ceil(totalPoints * 4), phase: "INSTALACOES_HIDROSSANITARIAS", category: "HIDRAULICA" },
    { name: "Caixa d'Água 1000L", unit: "un", quantity: 1, phase: "INSTALACOES_HIDROSSANITARIAS", category: "HIDRAULICA" },
    { name: "Fossa Séptica", unit: "un", quantity: 1, phase: "INSTALACOES_HIDROSSANITARIAS", category: "HIDRAULICA" },
    { name: "Box de Banheiro", unit: "un", quantity: wetRooms.length, phase: "INSTALACOES_HIDROSSANITARIAS", category: "HIDRAULICA" },
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
    if (room.wallTile) {
      wallTileArea += perimeter * (room.wallTileHeight ?? 1.5);
    }
  }

  const LOSS_FLOOR = 1.10;
  const LOSS_TILE = 1.10;
  const LOSS_ARG = 1.06;

  if (ceramicFloor > 0) {
    const area = Math.ceil(ceramicFloor * LOSS_FLOOR);
    results.push({ name: "Piso Cerâmico", unit: "m²", quantity: area, phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    // Argamassa: 1 sc / 3.5 m² → 0.286 sc/m² + 6% perda
    results.push({ name: "Argamassa AC-II (assentamento piso)", unit: "sc", quantity: Math.ceil(ceramicFloor * 0.286 * LOSS_ARG), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    results.push({ name: "Rejunte", unit: "kg", quantity: Math.ceil(ceramicFloor * 0.4 * LOSS_ARG), phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
  }
  if (porcelainFloor > 0) {
    const area = Math.ceil(porcelainFloor * LOSS_FLOOR);
    results.push({ name: "Piso Porcelanato", unit: "m²", quantity: area, phase: "REVESTIMENTOS", category: "REVESTIMENTO" });
    // Argamassa: 1 sc / 2.5 m² → 0.4 sc/m² + 6%
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
function calcPintura(rooms: RoomInput[]): MaterialResult[] {
  let paintWallArea = 0;

  for (const room of rooms) {
    if (room.paintWalls === false) continue;
    const perimeter = 2 * (room.width + room.length);
    const tileH = room.wallTile ? (room.wallTileHeight ?? 1.5) : 0;
    paintWallArea += perimeter * (room.height - tileH);
  }

  if (paintWallArea <= 0) return [];

  const LOSS = 1.08;
  // Massa corrida: 1 balde (20kg) por m² de parede
  const massaBuckets = Math.ceil(paintWallArea * 1.0 * LOSS);
  // Tinta PVA: 15L / 70m² = 0.214 L/m² × 2 demãos
  const tintaLitros = Math.ceil(paintWallArea * 0.214 * 2 * LOSS);

  return [
    { name: "Massa Corrida PVA (20kg)", unit: "bl", quantity: massaBuckets, phase: "PINTURA", category: "PINTURA" },
    { name: "Tinta Acrílica Fosca", unit: "L", quantity: tintaLitros, phase: "PINTURA", category: "PINTURA" },
  ];
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
    results.push({ name: "Batente/Marco de Porta", unit: "un", quantity: totalDoors, phase: "ACABAMENTO", category: "ESQUADRIA" });
    results.push({ name: "Fechadura Completa", unit: "un", quantity: totalDoors, phase: "ACABAMENTO", category: "ESQUADRIA" });
  }

  return results;
}

// ── Função principal ───────────────────────────────────────────────────────
export function calculateMaterials(input: CalculationInput): MaterialResult[] {
  return [
    ...calcTerraplenagem(input.rooms, input.structure),
    ...calcFundacao(input.rooms, input.structure),
    ...calcEstrutura(input.rooms, input.structure),
    ...calcAlvenaria(input.rooms, input.finishes, input.structure),
    ...calcLaje(input.rooms, input.structure),
    ...calcEscada(input.structure),
    ...calcCobertura(input.rooms, input.roofing),
    ...calcEletrica(input.rooms),
    ...calcHidrossanitaria(input.rooms),
    ...calcRevestimentos(input.rooms),
    ...calcPintura(input.rooms),
    ...calcAcabamento(input.finishes),
  ];
}
