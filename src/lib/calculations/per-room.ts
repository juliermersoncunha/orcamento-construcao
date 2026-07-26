import type { RoomInput } from "./index";

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

export function calculateRoomMaterials(room: RoomInput): RoomMaterialItem[] {
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
  if (room.paintWalls !== false) {
    const tileH = room.wallTile ? (room.wallTileHeight ?? 1.5) : 0;
    const paintArea = perimeter * (room.height - tileH);
    if (paintArea > 0) {
      results.push({ name: "Massa Corrida PVA (20kg)", unit: "bl", quantity: Math.ceil(paintArea * 1.0 * 1.08), category: "Pintura", formula: `${fmt(paintArea)} m² × 1,0 bl/m² × 1,08` });
      results.push({ name: "Tinta Acrílica Fosca", unit: "L", quantity: Math.ceil(paintArea * 0.214 * 2 * 1.08), category: "Pintura", formula: `${fmt(paintArea)} m² × 0,214 L/m² × 2 demãos × 1,08` });
    }
  }

  // ── Elétrica por ambiente ──
  const outlets = room.electricalOutlets ?? 0;
  const switches = room.electricalSwitches ?? 0;
  const lightPoints = room.electricalLightPoints ?? 0;
  if (outlets > 0) results.push({ name: "Tomada", unit: "un", quantity: outlets, category: "Elétrica", formula: `${outlets} ponto(s) cadastrado(s)` });
  if (switches > 0) results.push({ name: "Interruptor", unit: "un", quantity: switches, category: "Elétrica", formula: `${switches} ponto(s) cadastrado(s)` });
  if (lightPoints > 0) results.push({ name: "Ponto de iluminação", unit: "un", quantity: lightPoints, category: "Elétrica", formula: `${lightPoints} ponto(s) cadastrado(s)` });

  // ── Hidráulica por ambiente ──
  const waterInlets = room.hydraulicWaterInlets ?? 0;
  const drainPoints = room.hydraulicDrainPoints ?? 0;
  if (waterInlets > 0) results.push({ name: "Ponto de água", unit: "un", quantity: waterInlets, category: "Hidráulica", formula: `${waterInlets} ponto(s) cadastrado(s)` });
  if (drainPoints > 0) results.push({ name: "Ponto de esgoto", unit: "un", quantity: drainPoints, category: "Hidráulica", formula: `${drainPoints} ponto(s) cadastrado(s)` });

  return results;
}
