import type { RoomInput, StructureInput, RoofingInput, FinishesInput } from "./index";

export type CalcExplanation = {
  materialName: string;
  formula: string;
  result: string;
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round1(n: number) {
  return Math.ceil(n * 10) / 10;
}

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

const FOUNDATION_LABELS: Record<string, string> = {
  radier: "Radier",
  sapata_corrida: "Sapata corrida",
  sapata_isolada: "Sapata isolada",
  estaca: "Estaca (tubulão/hélice)",
};

const BLOCK_LABELS: Record<string, string> = {
  tijolo_furado: "Tijolo cerâmico furado",
  bloco_concreto: "Bloco de concreto",
  bloco_celular: "Bloco de concreto celular",
};

export function generateExplanations(
  rooms: RoomInput[],
  structure: StructureInput,
  roofing: RoofingInput,
  finishes: FinishesInput
): Record<string, CalcExplanation[]> {
  const area = totalFloorArea(rooms);
  const wallArea = totalWallArea(rooms);
  const result: Record<string, CalcExplanation[]> = {};

  // ── Terraplenagem ──
  {
    const soilVolume = round1(area * 0.3 * structure.floors);
    result["TERRAPLENAGEM"] = [
      {
        materialName: "Escavação e Terraplenagem",
        formula: `Área total (${fmt(area)} m²) × 0,30 m³/m² × ${structure.floors} pav.`,
        result: `${fmt(area * 0.3 * structure.floors)} → ${fmt(soilVolume)} m³`,
      },
      {
        materialName: "Compactação de Aterro",
        formula: `Área total (${fmt(area)} m²) arredondada`,
        result: `${Math.ceil(area)} m²`,
      },
    ];
  }

  // ── Fundação ──
  {
    const coefs: Record<string, { concrete: number; steel: number; forms: number }> = {
      radier: { concrete: 0.1, steel: 60, forms: 1.5 },
      sapata_corrida: { concrete: 0.08, steel: 80, forms: 0.8 },
      sapata_isolada: { concrete: 0.08, steel: 80, forms: 0.8 },
      estaca: { concrete: 0.1, steel: 100, forms: 0.5 },
    };
    const c = coefs[structure.foundationType] ?? coefs.sapata_corrida;
    const fLabel = FOUNDATION_LABELS[structure.foundationType] ?? structure.foundationType;

    result["FUNDACAO"] = [
      {
        materialName: "Concreto Usinado FCK 25 MPa",
        formula: `Área (${fmt(area)} m²) × ${fmt(c.concrete)} m³/m² [${fLabel}]`,
        result: `${fmt(area * c.concrete)} → ${fmt(round1(area * c.concrete))} m³`,
      },
      {
        materialName: "Aço CA-50 (vergalhão)",
        formula: `Área (${fmt(area)} m²) × ${c.steel} kg/m² [${fLabel}]`,
        result: `${fmt(area * c.steel)} → ${Math.ceil(area * c.steel)} kg`,
      },
      {
        materialName: "Fôrmas de Madeira (compensado 18mm)",
        formula: `Área (${fmt(area)} m²) × ${fmt(c.forms)} m²/m² [${fLabel}]`,
        result: `${fmt(area * c.forms)} → ${Math.ceil(area * c.forms)} m²`,
      },
    ];
  }

  // ── Estrutura ──
  {
    const areaStr = area * structure.floors;
    const concrete = round1(areaStr * 0.05);
    const steel = Math.ceil(concrete * 80);
    const forms = Math.ceil(concrete * 10);

    const floorNote = structure.floors > 1 ? ` × ${structure.floors} pav.` : "";
    result["ESTRUTURA_ALVENARIA_ESTRUTURA"] = [
      {
        materialName: "Concreto Usinado FCK 25 MPa",
        formula: `Área (${fmt(area)} m²${floorNote}) × 0,05 m³/m² [pilares+vigas]`,
        result: `${fmt(areaStr * 0.05)} → ${fmt(concrete)} m³`,
      },
      {
        materialName: "Aço CA-50 (vergalhão)",
        formula: `Concreto (${fmt(concrete)} m³) × 80 kg/m³`,
        result: `${fmt(concrete * 80)} → ${steel} kg`,
      },
      {
        materialName: "Fôrmas de Madeira (compensado 18mm)",
        formula: `Concreto (${fmt(concrete)} m³) × 10 m²/m³`,
        result: `${fmt(concrete * 10)} → ${forms} m²`,
      },
    ];
  }

  // ── Alvenaria ──
  {
    const wallAreaTotal = wallArea * structure.floors;
    const areaVaos =
      (finishes.doors + finishes.externalDoors) * 0.9 * 2.1 +
      finishes.windows * 1.2 * 1.2;
    const netWallArea = Math.max(wallAreaTotal - areaVaos, 0);
    const brickPerM2 = structure.blockType === "bloco_concreto" ? 12 : 25;
    const bLabel = BLOCK_LABELS[structure.blockType] ?? structure.blockType;
    const totalDoors = finishes.doors + finishes.externalDoors;

    const chapiscoArea = netWallArea * 2;
    const externalWallArea = netWallArea * 0.3;

    result["ESTRUTURA_ALVENARIA_ALVENARIA"] = [
      {
        materialName: "Área de parede bruta",
        formula: `Σ [2×(larg+comp) × pé dir.] por cômodo${structure.floors > 1 ? ` × ${structure.floors} pav.` : ""}`,
        result: `${fmt(wallAreaTotal)} m²`,
      },
      {
        materialName: "Desconto de vãos",
        formula: `${totalDoors} porta(s) × 0,9×2,1 m + ${finishes.windows} janela(s) × 1,2×1,2 m`,
        result: `– ${fmt(areaVaos)} m² → Parede líquida: ${fmt(netWallArea)} m²`,
      },
      {
        materialName: structure.blockType === "bloco_concreto" ? "Bloco de Concreto" : structure.blockType === "bloco_celular" ? "Bloco de Concreto Celular" : "Tijolo Cerâmico Furado 9x19x19",
        formula: `Parede líq. (${fmt(netWallArea)} m²) × ${brickPerM2} un/m² × 1,10 perda [${bLabel}]`,
        result: `${fmt(netWallArea * brickPerM2 * 1.1)} → ${Math.ceil(netWallArea * brickPerM2 * 1.1)} un`,
      },
      {
        materialName: "Cimento CP-II (50kg) – assentamento",
        formula: `Parede líq. (${fmt(netWallArea)} m²) × 0,07 sc/m² × 1,05 perda`,
        result: `${fmt(netWallArea * 0.07 * 1.05)} → ${Math.ceil(netWallArea * 0.07 * 1.05)} sc`,
      },
      {
        materialName: "Areia Média – assentamento",
        formula: `Parede líq. (${fmt(netWallArea)} m²) × 0,01 m³/m² × 1,05 perda`,
        result: `${fmt(netWallArea * 0.01 * 1.05)} → ${round1(netWallArea * 0.01 * 1.05)} m³`,
      },
      {
        materialName: "Cimento CP-II (50kg) – chapisco",
        formula: `Chapisco (${fmt(netWallArea)} × 2 lados = ${fmt(chapiscoArea)} m²) × 0,04 sc/m² × 1,05`,
        result: `${fmt(chapiscoArea * 0.04 * 1.05)} → ${Math.ceil(chapiscoArea * 0.04 * 1.05)} sc`,
      },
      {
        materialName: "Areia Grossa – chapisco",
        formula: `Chapisco (${fmt(chapiscoArea)} m²) × 0,006 m³/m² × 1,05`,
        result: `${fmt(chapiscoArea * 0.006 * 1.05)} → ${round1(chapiscoArea * 0.006 * 1.05)} m³`,
      },
      {
        materialName: "Cimento CP-II (50kg) – reboco interno",
        formula: `Parede líq. (${fmt(netWallArea)} m²) × 0,08 sc/m² × 1,10 perda`,
        result: `${fmt(netWallArea * 0.08 * 1.1)} → ${Math.ceil(netWallArea * 0.08 * 1.1)} sc`,
      },
      {
        materialName: "Areia Fina – reboco interno",
        formula: `Parede líq. (${fmt(netWallArea)} m²) × 0,018 m³/m² × 1,10`,
        result: `${fmt(netWallArea * 0.018 * 1.1)} → ${round1(netWallArea * 0.018 * 1.1)} m³`,
      },
      {
        materialName: "Cimento CP-II (50kg) – reboco externo",
        formula: `Parede ext. (${fmt(netWallArea)} × 30% = ${fmt(externalWallArea)} m²) × 0,10 sc/m² × 1,10`,
        result: `${fmt(externalWallArea * 0.1 * 1.1)} → ${Math.ceil(externalWallArea * 0.1 * 1.1)} sc`,
      },
      {
        materialName: "Areia Fina – reboco externo",
        formula: `Parede ext. (${fmt(externalWallArea)} m²) × 0,024 m³/m² × 1,10`,
        result: `${fmt(externalWallArea * 0.024 * 1.1)} → ${round1(externalWallArea * 0.024 * 1.1)} m³`,
      },
    ];
  }

  // ── Laje ──
  if (structure.hasLaje) {
    const lajeArea = area * (structure.floors - 1 || 1);
    result["LAJE"] = [
      {
        materialName: "Concreto Usinado FCK 25 MPa",
        formula: `Área (${fmt(area)} m²) × ${structure.floors - 1 || 1} laje(s) × 0,12 m³/m²`,
        result: `${fmt(lajeArea * 0.12)} → ${fmt(round1(lajeArea * 0.12))} m³`,
      },
      {
        materialName: "Aço CA-50 (vergalhão)",
        formula: `Área laje (${fmt(lajeArea)} m²) × 12 kg/m²`,
        result: `${fmt(lajeArea * 12)} → ${Math.ceil(lajeArea * 12)} kg`,
      },
      {
        materialName: "Escoramento/Fôrma para Laje",
        formula: `Área laje (${fmt(lajeArea)} m²) × 1,0 m²/m²`,
        result: `${Math.ceil(lajeArea)} m²`,
      },
    ];
  }

  // ── Escada ──
  if (structure.hasEscada && structure.floors >= 2) {
    const lances = structure.floors - 1;
    result["ESCADA"] = [
      {
        materialName: "Concreto Usinado FCK 25 MPa",
        formula: `${lances} lance(s) × 2 m³/lance`,
        result: `${2 * lances} m³`,
      },
      {
        materialName: "Aço CA-50 (vergalhão)",
        formula: `${lances} lance(s) × 150 kg/lance`,
        result: `${150 * lances} kg`,
      },
      {
        materialName: "Fôrmas de Madeira (escada)",
        formula: `${lances} lance(s) × 15 m²/lance`,
        result: `${15 * lances} m²`,
      },
    ];
  }

  // ── Cobertura ──
  if (roofing.hasRoof && roofing.roofType !== "laje_impermeabilizada") {
    const inclRad = toRadians(roofing.inclination);
    const roofArea = round1((area / Math.cos(inclRad)) * 1.15);
    const tilesCoverage =
      roofing.tileType === "ceramica" ? 25
      : roofing.tileType === "fibrocimento" ? 10
      : 8;
    const tileName =
      roofing.tileType === "ceramica" ? "Telha Cerâmica"
      : roofing.tileType === "fibrocimento" ? "Telha de Fibrocimento"
      : "Telha Metálica";

    result["COBERTURA"] = [
      {
        materialName: "Área de telhado",
        formula: `Área piso (${fmt(area)} m²) ÷ cos(${roofing.inclination}°) × 1,15 beiral`,
        result: `${fmt(roofArea)} m²`,
      },
      {
        materialName: tileName,
        formula: `Telhado (${fmt(roofArea)} m²) × ${tilesCoverage} un/m² × 1,10 perda`,
        result: `${fmt(roofArea * tilesCoverage * 1.1)} → ${Math.ceil(roofArea * tilesCoverage * 1.1)} un`,
      },
      {
        materialName: "Caibro 5x7cm (pinus)",
        formula: `Telhado (${fmt(roofArea)} m²) × 3,5 m/m²`,
        result: `${fmt(roofArea * 3.5)} → ${Math.ceil(roofArea * 3.5)} m`,
      },
      {
        materialName: "Ripa 2,5x5cm (pinus)",
        formula: `Telhado (${fmt(roofArea)} m²) × 6 m/m²`,
        result: `${fmt(roofArea * 6)} → ${Math.ceil(roofArea * 6)} m`,
      },
      {
        materialName: "Cumeeira",
        formula: `Telhado (${fmt(roofArea)} m²) × 0,15 un/m²`,
        result: `${fmt(roofArea * 0.15)} → ${Math.ceil(roofArea * 0.15)} un`,
      },
    ];
  }

  // ── Elétrica ──
  {
    const totalPoints = Math.ceil(area * 0.22);
    if (totalPoints > 0) {
      result["INSTALACOES_ELETRICAS"] = [
        {
          materialName: "Pontos elétricos estimados",
          formula: `Área total (${fmt(area)} m²) × 0,22 pontos/m²`,
          result: `${fmt(area * 0.22)} → ${totalPoints} pontos`,
        },
        {
          materialName: "Conduíte Corrugado 3/4\"",
          formula: `${totalPoints} pontos × 3 m/ponto`,
          result: `${totalPoints * 3} m`,
        },
        {
          materialName: "Fio Flexível 2,5mm²",
          formula: `${totalPoints} pontos × 4 m/ponto`,
          result: `${totalPoints * 4} m`,
        },
        {
          materialName: "Caixa de Passagem 4x4/4x2",
          formula: `1 caixa por ponto`,
          result: `${totalPoints} un`,
        },
        {
          materialName: "Quadro de Distribuição",
          formula: `1 por unidade habitacional`,
          result: `1 un`,
        },
        {
          materialName: "Disjuntor/DR",
          formula: `${totalPoints} pontos ÷ 8 + 1 (geral)`,
          result: `${Math.ceil(totalPoints / 8) + 1} un`,
        },
      ];
    }
  }

  // ── Hidrossanitária ──
  {
    const wetRooms = rooms.filter((r) => (r.hydraulicDrainPoints ?? 0) > 0 || (r.hydraulicWaterInlets ?? 0) > 0);
    const wetRoomNames = wetRooms.map((r) => r.name).join(", ");
    const totalWaterPoints = wetRooms.length * 4;
    const totalDrainPoints = wetRooms.length * 4;
    const totalPoints = totalWaterPoints + totalDrainPoints;

    if (totalPoints > 0) {
      result["INSTALACOES_HIDROSSANITARIAS"] = [
        {
          materialName: "Cômodos molhados",
          formula: `${wetRooms.length} ambiente(s): ${wetRoomNames || "(nenhum)"}`,
          result: `${totalWaterPoints} pontos água + ${totalDrainPoints} pontos esgoto`,
        },
        {
          materialName: "Tubo PVC Água Fria 3/4\"",
          formula: `${totalWaterPoints} pontos água × 5 m/ponto`,
          result: `${totalWaterPoints * 5} m`,
        },
        {
          materialName: "Tubo PVC Esgoto 100mm",
          formula: `${totalDrainPoints} pontos esgoto × 4 m/ponto`,
          result: `${totalDrainPoints * 4} m`,
        },
        {
          materialName: "Conexões e Registros",
          formula: `${totalPoints} pontos totais × 4 conexões/ponto`,
          result: `${totalPoints * 4} un`,
        },
        {
          materialName: "Caixa d'Água 1000L",
          formula: `1 por unidade habitacional`,
          result: `1 un`,
        },
        {
          materialName: "Fossa Séptica",
          formula: `1 por unidade habitacional`,
          result: `1 un`,
        },
        {
          materialName: "Box de Banheiro",
          formula: `1 por cômodo molhado`,
          result: `${wetRooms.length} un`,
        },
      ];
    }
  }

  // ── Revestimentos ──
  {
    const explanations: CalcExplanation[] = [];
    let ceramicFloor = 0;
    let porcelainFloor = 0;
    let wallTileArea = 0;
    const ceramicRooms: string[] = [];
    const porcelainRooms: string[] = [];
    const wallTileRooms: string[] = [];

    for (const room of rooms) {
      const floorArea = room.width * room.length;
      if (room.floorType === "porcelanato") {
        porcelainFloor += floorArea;
        porcelainRooms.push(`${room.name} (${fmt(floorArea)} m²)`);
      } else if (room.floorType !== "madeira" && room.floorType !== "cimento") {
        ceramicFloor += floorArea;
        ceramicRooms.push(`${room.name} (${fmt(floorArea)} m²)`);
      }
      if (room.wallTile) {
        const perimeter = 2 * (room.width + room.length);
        const h = room.wallTileHeight ?? 1.5;
        wallTileArea += perimeter * h;
        wallTileRooms.push(`${room.name} (${fmt(perimeter * h)} m²)`);
      }
    }

    if (ceramicFloor > 0) {
      explanations.push({
        materialName: "Piso Cerâmico",
        formula: `${ceramicRooms.join(" + ")} × 1,10 perda`,
        result: `${fmt(ceramicFloor)} × 1,10 = ${Math.ceil(ceramicFloor * 1.1)} m²`,
      });
      explanations.push({
        materialName: "Argamassa AC-II (assentamento piso)",
        formula: `${fmt(ceramicFloor)} m² × 0,286 sc/m² × 1,06 perda`,
        result: `${fmt(ceramicFloor * 0.286 * 1.06)} → ${Math.ceil(ceramicFloor * 0.286 * 1.06)} sc`,
      });
      explanations.push({
        materialName: "Rejunte (piso cerâmico)",
        formula: `${fmt(ceramicFloor)} m² × 0,4 kg/m² × 1,06`,
        result: `${fmt(ceramicFloor * 0.4 * 1.06)} → ${Math.ceil(ceramicFloor * 0.4 * 1.06)} kg`,
      });
    }
    if (porcelainFloor > 0) {
      explanations.push({
        materialName: "Piso Porcelanato",
        formula: `${porcelainRooms.join(" + ")} × 1,10 perda`,
        result: `${fmt(porcelainFloor)} × 1,10 = ${Math.ceil(porcelainFloor * 1.1)} m²`,
      });
    }
    if (wallTileArea > 0) {
      explanations.push({
        materialName: "Revestimento Cerâmico (parede)",
        formula: `${wallTileRooms.join(" + ")} × 1,10 perda`,
        result: `${fmt(wallTileArea)} × 1,10 = ${Math.ceil(wallTileArea * 1.1)} m²`,
      });
    }

    if (explanations.length > 0) {
      result["REVESTIMENTOS"] = explanations;
    }
  }

  // ── Pintura ──
  {
    let paintWallArea = 0;
    const paintRooms: string[] = [];

    for (const room of rooms) {
      if (room.paintWalls === false) continue;
      const perimeter = 2 * (room.width + room.length);
      const tileH = room.wallTile ? (room.wallTileHeight ?? 1.5) : 0;
      const paintArea = perimeter * (room.height - tileH);
      paintWallArea += paintArea;
      paintRooms.push(`${room.name} (${fmt(paintArea)} m²)`);
    }

    if (paintWallArea > 0) {
      result["PINTURA"] = [
        {
          materialName: "Área de pintura",
          formula: `Σ [perímetro × (pé dir. − azulejo)] por cômodo`,
          result: `${paintRooms.join(" + ")} = ${fmt(paintWallArea)} m²`,
        },
        {
          materialName: "Massa Corrida PVA (20kg)",
          formula: `${fmt(paintWallArea)} m² × 1,0 bl/m² × 1,08 perda`,
          result: `${fmt(paintWallArea * 1.08)} → ${Math.ceil(paintWallArea * 1.08)} bl`,
        },
        {
          materialName: "Tinta Acrílica Fosca",
          formula: `${fmt(paintWallArea)} m² × 0,214 L/m² × 2 demãos × 1,08 perda`,
          result: `${fmt(paintWallArea * 0.214 * 2 * 1.08)} → ${Math.ceil(paintWallArea * 0.214 * 2 * 1.08)} L`,
        },
      ];
    }
  }

  // ── Acabamento ──
  {
    const totalDoors = finishes.doors + finishes.externalDoors;
    const explanations: CalcExplanation[] = [];
    if (finishes.externalDoors > 0) {
      explanations.push({
        materialName: "Porta Externa (painel/madeira)",
        formula: `Quantidade informada na etapa de acabamentos`,
        result: `${finishes.externalDoors} un`,
      });
    }
    if (finishes.doors > 0) {
      explanations.push({
        materialName: "Porta Interna (madeira)",
        formula: `Quantidade informada na etapa de acabamentos`,
        result: `${finishes.doors} un`,
      });
    }
    if (finishes.windows > 0) {
      explanations.push({
        materialName: "Janela (alumínio)",
        formula: `Quantidade informada na etapa de acabamentos`,
        result: `${finishes.windows} un`,
      });
    }
    if (totalDoors > 0) {
      explanations.push({
        materialName: "Batente/Marco de Porta",
        formula: `${finishes.externalDoors} ext. + ${finishes.doors} int.`,
        result: `${totalDoors} un`,
      });
      explanations.push({
        materialName: "Fechadura Completa",
        formula: `1 por porta`,
        result: `${totalDoors} un`,
      });
    }
    if (explanations.length > 0) {
      result["ACABAMENTO"] = explanations;
    }
  }

  return result;
}
