import type { RoomInput } from "./index";
import {
  ELECTRICAL_FINISH_DEFAULTS,
  outletMaterialsPerPoint, switchMaterialsPerPoint, lightPointMaterialsPerPoint,
} from "./electrical-finishes";
import type { ElectricalFinishes } from "./electrical-finishes";

export type RoomMaterialItem = {
  name: string;
  unit: string;
  quantity: number;
  category: string;
  formula: string;
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function calculateRoomMaterials(
  room: RoomInput,
  wallFinishType: "SO_TINTA" | "MASSA_TINTA" | "GESSO_TINTA" = "SO_TINTA",
  electrical: ElectricalFinishes = ELECTRICAL_FINISH_DEFAULTS
): RoomMaterialItem[] {
  const results: RoomMaterialItem[] = [];
  const floorArea = room.width * room.length;
  const perimeter = 2 * (room.width + room.length);

  // ── Revestimento de piso ──
  if (room.floorType === "porcelanato") {
    results.push({ name: "Piso Porcelanato", unit: "m²", quantity: Math.ceil(floorArea * 1.10), category: "Revestimento", formula: `${fmt(floorArea)} m² × 1,10 perda` });
    results.push({ name: "Argamassa AC-III (assentamento porcelanato)", unit: "sc", quantity: Math.ceil(floorArea * 0.4 * 1.06), category: "Revestimento", formula: `${fmt(floorArea)} m² × 0,40 sc/m² × 1,06` });
    results.push({ name: "Rejunte", unit: "kg", quantity: Math.ceil(floorArea * 0.4 * 1.06), category: "Revestimento", formula: `${fmt(floorArea)} m² × 0,40 kg/m² × 1,06` });
  } else if (room.floorType !== "madeira" && room.floorType !== "cimento") {
    results.push({ name: "Piso Cerâmico", unit: "m²", quantity: Math.ceil(floorArea * 1.10), category: "Revestimento", formula: `${fmt(floorArea)} m² × 1,10 perda` });
    results.push({ name: "Argamassa AC-II (assentamento piso)", unit: "sc", quantity: Math.ceil(floorArea * 0.286 * 1.06), category: "Revestimento", formula: `${fmt(floorArea)} m² × 0,286 sc/m² × 1,06` });
    results.push({ name: "Rejunte", unit: "kg", quantity: Math.ceil(floorArea * 0.4 * 1.06), category: "Revestimento", formula: `${fmt(floorArea)} m² × 0,40 kg/m² × 1,06` });
  }

  // ── Revestimento de parede (azulejo) ──
  if (room.wallTile) {
    const h = room.wallTileHeight ?? 1.5;
    const wallTileArea = perimeter * h;
    results.push({ name: "Revestimento Cerâmico (parede)", unit: "m²", quantity: Math.ceil(wallTileArea * 1.10), category: "Revestimento", formula: `${fmt(perimeter)} m × ${fmt(h)} m × 1,10 perda` });
    results.push({ name: "Argamassa AC-I (assentamento azulejo)", unit: "sc", quantity: Math.ceil(wallTileArea * 0.45), category: "Revestimento", formula: `${fmt(wallTileArea)} m² × 0,45 sc/m²` });
    results.push({ name: "Rejunte", unit: "kg", quantity: Math.ceil(wallTileArea * 0.4 * 1.06), category: "Revestimento", formula: `${fmt(wallTileArea)} m² × 0,40 kg/m² × 1,06` });
  }

  // ── Pintura ──
  // Mesmos coeficientes do cálculo global (calcPintura em index.ts) — quem
  // mudar aqui precisa mudar lá, senão a visão por ambiente diverge do
  // consolidado.
  if (room.paintWalls !== false) {
    const tileH = room.wallTile ? (room.wallTileHeight ?? 1.5) : 0;
    const paintArea = perimeter * (room.height - tileH);
    if (paintArea > 0) {
      if (wallFinishType === "MASSA_TINTA") {
        results.push({ name: "Massa corrida", unit: "kg", quantity: Math.ceil(paintArea * 1.48), category: "Pintura", formula: `${fmt(paintArea)} m² × 0,70 kg/m² × 2 demãos × 1,06` });
        results.push({ name: "Lixa para massa", unit: "un", quantity: Math.ceil(paintArea * 0.2), category: "Pintura", formula: `${fmt(paintArea)} m² × 0,20 un/m²` });
      } else if (wallFinishType === "GESSO_TINTA") {
        results.push({ name: "Gesso liso", unit: "kg", quantity: Math.ceil(paintArea * 1.26), category: "Pintura", formula: `${fmt(paintArea)} m² × 1,20 kg/m² × 1,05` });
        results.push({ name: "Lixa para massa", unit: "un", quantity: Math.ceil(paintArea * 0.2), category: "Pintura", formula: `${fmt(paintArea)} m² × 0,20 un/m²` });
      }
      results.push({ name: "Selador acrílico", unit: "L", quantity: Math.ceil(paintArea * 0.10), category: "Pintura", formula: `${fmt(paintArea)} m² × 0,10 L/m²` });
      results.push({ name: "Tinta Acrílica Fosca", unit: "L", quantity: Math.ceil(paintArea * 0.18), category: "Pintura", formula: `${fmt(paintArea)} m² × 0,18 L/m² (2 demãos)` });
    }
  }

  // ── Elétrica por ambiente ──
  // O tipo de cada ponto vem das preferências globais do projeto e casa com
  // um material específico do catálogo — assim o memorial mostra preço.
  const outlets = room.electricalOutlets ?? 0;
  const switches = room.electricalSwitches ?? 0;
  const lightPoints = room.electricalLightPoints ?? 0;
  if (outlets > 0) {
    const m = outletMaterialsPerPoint(electrical.outletType);
    results.push({ name: m.name, unit: m.unit, quantity: outlets * m.qty, category: "Elétrica", formula: `${outlets} ponto(s) × ${m.qty}` });
  }
  if (switches > 0) {
    const m = switchMaterialsPerPoint(electrical.switchType);
    results.push({ name: m.name, unit: m.unit, quantity: switches * m.qty, category: "Elétrica", formula: `${switches} ponto(s) × ${m.qty}` });
  }
  if (lightPoints > 0) {
    for (const m of lightPointMaterialsPerPoint(electrical.lightPointType)) {
      results.push({ name: m.name, unit: m.unit, quantity: lightPoints * m.qty, category: "Elétrica", formula: `${lightPoints} ponto(s) × ${m.qty}` });
    }
  }

  // ── Hidráulica por ambiente ──
  const waterInlets = room.hydraulicWaterInlets ?? 0;
  const drainPoints = room.hydraulicDrainPoints ?? 0;
  if (waterInlets > 0) results.push({ name: "Ponto de água", unit: "un", quantity: waterInlets, category: "Hidráulica", formula: `${waterInlets} ponto(s) cadastrado(s)` });
  if (drainPoints > 0) results.push({ name: "Ponto de esgoto", unit: "un", quantity: drainPoints, category: "Hidráulica", formula: `${drainPoints} ponto(s) cadastrado(s)` });

  return results;
}
