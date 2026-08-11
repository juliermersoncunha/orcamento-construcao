import type { RoomInput, StructureInput, RoofingInput, FinishesInput } from "./index";
import { tileConsumption } from "./index";

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


const BLOCK_LABELS: Record<string, string> = {
  tijolo_furado: "Tijolo cerâmico furado",
  bloco_concreto: "Bloco de concreto",
  bloco_celular: "Bloco de concreto celular",
};

function tracoExplanations(
  volumeM3: number,
  label: string,
  phase: string,
): CalcExplanation[] {
  if (volumeM3 <= 0) return [];
  return [
    {
      materialName: `Cimento CP-II (50kg) – concreto`,
      formula: `Volume concreto ${label} (${fmt(volumeM3)} m³) × 8 sc/m³ [traço 1:2:3]`,
      result: `${fmt(volumeM3 * 8)} → ${Math.ceil(volumeM3 * 8)} sc`,
    },
    {
      materialName: `Areia Média – concreto`,
      formula: `Volume concreto ${label} (${fmt(volumeM3)} m³) × 0,56 m³/m³ [traço 1:2:3]`,
      result: `${fmt(volumeM3 * 0.56)} → ${round1(volumeM3 * 0.56)} m³`,
    },
    {
      materialName: `Brita 1 – concreto`,
      formula: `Volume concreto ${label} (${fmt(volumeM3)} m³) × 0,84 m³/m³ [traço 1:2:3]`,
      result: `${fmt(volumeM3 * 0.84)} → ${round1(volumeM3 * 0.84)} m³`,
    },
  ];
}

// Concreto pela regra de rendimento do traço 1:2:3 (0,140 m³ por saco de 50kg:
// 35 L cimento + 70 L areia + 105 L brita). Usado na laje.
function tracoRendimentoExplanations(
  volumeM3: number,
  label: string,
  phase: string,
): CalcExplanation[] {
  if (volumeM3 <= 0) return [];
  const sacos = volumeM3 / 0.140;
  return [
    {
      materialName: `Cimento CP-II (50kg) – concreto`,
      formula: `Volume concreto ${label} (${fmt(volumeM3)} m³) ÷ 0,140 m³/saco [rend. 1:2:3]`,
      result: `${fmt(sacos)} → ${Math.ceil(sacos)} sc`,
    },
    {
      materialName: `Areia Média – concreto`,
      formula: `${fmt(sacos)} sacos × 0,070 m³/saco`,
      result: `${fmt(sacos * 0.070)} → ${round1(sacos * 0.070)} m³`,
    },
    {
      materialName: `Brita 1 – concreto`,
      formula: `${fmt(sacos)} sacos × 0,105 m³/saco`,
      result: `${fmt(sacos * 0.105)} → ${round1(sacos * 0.105)} m³`,
    },
  ];
}

export function generateExplanations(
  rooms: RoomInput[],
  structure: StructureInput,
  roofing: RoofingInput,
  finishes: FinishesInput
): Record<string, CalcExplanation[]> {
  const area = totalFloorArea(rooms);
  const result: Record<string, CalcExplanation[]> = {};

  // ── Terraplenagem (manual) ──
  {
    const items: CalcExplanation[] = [];
    if (structure.escavacaoM3 > 0) {
      items.push({
        materialName: "Escavação e Terraplenagem",
        formula: `Valor informado manualmente`,
        result: `${fmt(structure.escavacaoM3)} m³`,
      });
    }
    if (structure.compactacaoM2 > 0) {
      items.push({
        materialName: "Compactação de Aterro",
        formula: `Valor informado manualmente`,
        result: `${Math.ceil(structure.compactacaoM2)} m²`,
      });
    }
    if (items.length > 0) result["TERRAPLENAGEM"] = items;
  }

  // ── Fundação (radier ou sapatas) ──
  if (structure.foundationType === "radier") {
    const volRadier = structure.radierArea * structure.radierEspessura;
    if (volRadier > 0) {
      result["FUNDACAO"] = [
        {
          materialName: "Volume de concreto – radier",
          formula: `Área (${fmt(structure.radierArea)} m²) × espessura (${fmt(structure.radierEspessura)} m)`,
          result: `${fmt(volRadier)} m³`,
        },
        ...tracoRendimentoExplanations(volRadier, "radier", "FUNDACAO"),
      ];
    }
  } else {
    const vol = structure.sapataQtd * structure.sapataLargura * structure.sapataCompr * structure.sapataAltura;
    if (vol > 0) {
      result["FUNDACAO"] = [
        {
          materialName: "Volume de concreto – sapatas",
          formula: `${structure.sapataQtd} sapatas × ${fmt(structure.sapataLargura)} m (larg.) × ${fmt(structure.sapataCompr)} m (comp.) × ${fmt(structure.sapataAltura)} m (alt.)`,
          result: `${fmt(vol)} m³`,
        },
        ...tracoExplanations(vol, "sapatas", "FUNDACAO"),
        {
          materialName: "Armação de Sapata",
          formula: `${structure.sapataQtd} sapatas — peça fabricada`,
          result: `${structure.sapataQtd} un`,
        },
      ];
    }
  }

  // ── Estrutura (pilares + vigas) ──
  {
    const volPilar = structure.pilarMetros * structure.pilarLargura * structure.pilarAltura;
    const volViga = structure.vigaMetros * structure.vigaLargura * structure.vigaAltura;
    const volTotal = volPilar + volViga;

    if (volTotal > 0) {
      const explanations: CalcExplanation[] = [];

      if (volPilar > 0) {
        explanations.push({
          materialName: "Volume concreto – pilares",
          formula: `${fmt(structure.pilarMetros)} m × ${fmt(structure.pilarLargura)} m (larg.) × ${fmt(structure.pilarAltura)} m (alt.)`,
          result: `${fmt(volPilar)} m³`,
        });
      }
      if (volViga > 0) {
        explanations.push({
          materialName: "Volume concreto – vigas",
          formula: `${fmt(structure.vigaMetros)} m × ${fmt(structure.vigaLargura)} m (larg.) × ${fmt(structure.vigaAltura)} m (alt.)`,
          result: `${fmt(volViga)} m³`,
        });
      }
      if (volPilar > 0 && volViga > 0) {
        explanations.push({
          materialName: "Volume total concreto estrutura",
          formula: `Pilares (${fmt(volPilar)} m³) + Vigas (${fmt(volViga)} m³)`,
          result: `${fmt(volTotal)} m³`,
        });
      }

      explanations.push(
        ...tracoExplanations(volTotal, "estrutura", "ESTRUTURA"),
      );
      if (structure.pilarMetros > 0) {
        explanations.push({
          materialName: "Armação de Pilar",
          formula: `${fmt(structure.pilarMetros)} metros lineares — peça fabricada`,
          result: `${fmt(structure.pilarMetros)} m`,
        });
      }
      if (structure.vigaMetros > 0) {
        explanations.push({
          materialName: "Armação de Viga",
          formula: `${fmt(structure.vigaMetros)} metros lineares — peça fabricada`,
          result: `${fmt(structure.vigaMetros)} m`,
        });
      }
      result["ESTRUTURA_ALVENARIA_ESTRUTURA"] = explanations;
    }
  }

  // ── Fôrmas de madeira (manual) ──
  if (structure.formasM2 > 0) {
    result["ESTRUTURA_ALVENARIA_ESTRUTURA"] = [
      ...(result["ESTRUTURA_ALVENARIA_ESTRUTURA"] ?? []),
      {
        materialName: "Fôrmas de Madeira (compensado 18mm)",
        formula: `Valor informado manualmente`,
        result: `${Math.ceil(structure.formasM2)} m²`,
      },
    ];
  }

  // ── Alvenaria ──
  {
    const perimTotal = structure.perimetroParedesExt + structure.perimetroParedesInt;
    const platibandaArea = structure.hasPlatibanda
      ? structure.platibandaML * structure.platibandaAltura
      : 0;
    const wallAreaTotal = perimTotal * structure.peDireito * structure.floors + platibandaArea;
    const areaVaos =
      (finishes.doors + finishes.externalDoors) * 0.9 * 2.1 +
      finishes.windows * 1.2 * 1.2;
    const netWallArea = Math.max(wallAreaTotal - areaVaos, 0);
    const brickPerM2 = structure.blockType === "bloco_concreto" ? 12 : 25;
    const bLabel = BLOCK_LABELS[structure.blockType] ?? structure.blockType;
    const totalDoors = finishes.doors + finishes.externalDoors;

    const chapiscoArea = netWallArea * 2;
    const externalWallArea =
      structure.perimetroParedesExt * structure.peDireito * structure.floors + platibandaArea;

    result["ESTRUTURA_ALVENARIA_ALVENARIA"] = [
      {
        materialName: "Área de parede bruta",
        formula: `(${fmt(structure.perimetroParedesExt)} m ext + ${fmt(structure.perimetroParedesInt)} m int) × ${fmt(structure.peDireito)} m pé dir.${structure.floors > 1 ? ` × ${structure.floors} pav.` : ""}${structure.hasPlatibanda ? ` + platibanda ${fmt(structure.platibandaML)}×${fmt(structure.platibandaAltura)} m` : ""}`,
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
        formula: `Parede ext. (${fmt(externalWallArea)} m²) × 0,10 sc/m² × 1,10`,
        result: `${fmt(externalWallArea * 0.1 * 1.1)} → ${Math.ceil(externalWallArea * 0.1 * 1.1)} sc`,
      },
      {
        materialName: "Areia Fina – reboco externo",
        formula: `Parede ext. (${fmt(externalWallArea)} m²) × 0,024 m³/m² × 1,10`,
        result: `${fmt(externalWallArea * 0.024 * 1.1)} → ${round1(externalWallArea * 0.024 * 1.1)} m³`,
      },
    ];
  }

  // ── Laje pré-moldada ──
  if (structure.hasLaje) {
    const lajeArea = area * (structure.floors - 1 || 1);
    const coefConcreto = structure.lajeType === "piso" ? 0.058 : 0.048;
    const lajeLabel = structure.lajeType === "piso" ? "piso" : "forro";
    const concreteVol = round1(lajeArea * coefConcreto);

    result["LAJE"] = [
      {
        materialName: "Laje pré-moldada treliçada",
        formula: `Área (${fmt(area)} m²) × ${structure.floors - 1 || 1} laje(s)`,
        result: `${Math.ceil(lajeArea)} m²`,
      },
      {
        materialName: "Volume de concreto – laje",
        formula: `Área laje (${fmt(lajeArea)} m²) × ${fmt(coefConcreto)} m³/m² [laje ${lajeLabel}]`,
        result: `${fmt(lajeArea * coefConcreto)} → ${fmt(concreteVol)} m³`,
      },
      ...tracoRendimentoExplanations(concreteVol, "laje", "LAJE"),
    ];
  }

  // ── Escada ──
  if (structure.hasEscada && structure.floors >= 2) {
    const lances = structure.floors - 1;
    const vol = 2 * lances;
    result["ESCADA"] = [
      {
        materialName: "Volume de concreto – escada",
        formula: `${lances} lance(s) × 2 m³/lance`,
        result: `${fmt(vol)} m³`,
      },
      ...tracoExplanations(vol, "escada", "ESCADA"),
    ];
  }

  // ── Cobertura ──
  if (roofing.hasRoof && roofing.roofType !== "laje_impermeabilizada") {
    const inclRad = toRadians(roofing.inclination);
    const roofArea = round1((area / Math.cos(inclRad)) * 1.15);
    const { name: tileName, perM2 } = tileConsumption(roofing);

    result["COBERTURA"] = [
      {
        materialName: "Área de telhado",
        formula: `Área piso (${fmt(area)} m²) ÷ cos(${roofing.inclination}°) × 1,15 beiral`,
        result: `${fmt(roofArea)} m²`,
      },
      {
        materialName: tileName,
        formula: `Telhado (${fmt(roofArea)} m²) × ${perM2.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} un/m² × 1,10 perda`,
        result: `${fmt(roofArea * perM2 * 1.1)} → ${Math.ceil(roofArea * perM2 * 1.1)} un`,
      },
      ...((roofing.caibroM ?? 0) > 0
        ? [{
            materialName: "Caibro 5x7cm (pinus)",
            formula: `Valor informado manualmente (madeiramento)`,
            result: `${Math.ceil(roofing.caibroM as number)} m`,
          }]
        : []),
      ...((roofing.ripaM ?? 0) > 0
        ? [{
            materialName: "Ripa 2,5x5cm (pinus)",
            formula: `Valor informado manualmente (madeiramento)`,
            result: `${Math.ceil(roofing.ripaM as number)} m`,
          }]
        : []),
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
