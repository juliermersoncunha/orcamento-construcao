// Fixture engine — resolves a `Fixture` (installed equipment) into a flat list of
// material items with source, formula and quantity.
//
// Pure function (no I/O): receives loaded Materials + Premises + Fixtures.
// Emits `FixtureMaterialItem[]` compatible with the existing report structure.
//
// Does NOT touch existing per-phase calculations. The room-aware report merges
// these items into "Materiais por Ambiente"; consolidation happens on the report side.

import { IMPERM_SYSTEMS } from "@/lib/fixture-library/bathroom";
import { getFixtureSpec, getAccessorySpec, getJoineryDependencies } from "@/lib/fixture-library/registry";
import type { FixtureQuantity, DependencySpec, MaterialResolver } from "@/lib/fixture-library/types";
import { argamassaParede } from "@/lib/room-classification";

// ── Inputs to the engine ───────────────────────────────────────────────────

export type PremiseValue = { key: string; value: number };

export type FixtureInput = {
  id: string;
  roomId: string;
  fixtureType: string;
  quantity: number;
  configJson: string | null;
  includedComponents: string[];
};

export type RoomJoineryInput = {
  id: string;
  roomId: string;
  joineryType: string;
  subtype: string;
  quantity: number;
  includedComponents: string[];
  width?: number;
  height?: number;
  configJson?: string | null;
};

export type AccessoryInput = {
  id: string;
  roomId: string;
  accessoryType: string;
  quantity: number;
  configJson?: string | null;
};

export type ImpermInput = {
  roomId: string;
  scope: string;         // NENHUM | BOX | PISO | PISO_PAREDES | CUSTOM
  area: number;
  wallHeight: number;
  ralos: number;
  tubulacoes: number;
  system: string;        // argamassa_polimerica | manta_asfaltica
  coats: number;
  mechProtection: boolean;
};

export type RoomWallFinishInput = {
  wallSide: string;      // FRENTE | FUNDO | ESQUERDA | DIREITA | BOX | PIA
  hasTile: boolean;
  tileHeight: number;
  // Cozinha modo "só parede da pia": comprimento informado; ignora o perímetro
  wallLength?: number | null;
};

export type RoomEngineInput = {
  id: string;
  name: string;
  roomType: string | null;
  width: number;
  length: number;
  height: number;
  fixtures: FixtureInput[];
  joineries: RoomJoineryInput[];
  accessories: AccessoryInput[];
  imperm: ImpermInput | null;
  wallFinishes: RoomWallFinishInput[];
};

// ── Output ─────────────────────────────────────────────────────────────────

export type FixtureMaterialItem = {
  materialName: string;
  unit: string;
  category: string;
  phase: string;                     // mapped from category
  quantity: number;                  // final rounded qty
  roomId: string;
  roomName: string;
  sourceKind: "FIXTURE" | "JOINERY" | "ACCESSORY" | "IMPERM" | "WALLFINISH";
  sourceId: string;                  // fixture.id | joinery.id | accessory.id | "imperm:roomId"
  sourceLabel: string;               // human name of the source ("Vaso c/ caixa acoplada")
  formula: string;                   // memory-of-calc string
};

// ── Category → Phase mapping ───────────────────────────────────────────────

const CATEGORY_TO_PHASE: Record<string, string> = {
  LOUCAS_SANITARIAS:      "INSTALACOES_HIDROSSANITARIAS",
  METAIS_SANITARIOS:      "INSTALACOES_HIDROSSANITARIAS",
  ACESSORIOS_HIDRAULICOS: "INSTALACOES_HIDROSSANITARIAS",
  HIDRAULICA:             "INSTALACOES_HIDROSSANITARIAS",
  ELETRICA:               "INSTALACOES_ELETRICAS",
  IMPERMEABILIZACAO:      "REVESTIMENTOS",
  REVESTIMENTO:           "REVESTIMENTOS",
  PINTURA:                "PINTURA",
  VIDROS_BOX:             "ACABAMENTO",
  ACESSORIOS_BANHEIRO:    "ACABAMENTO",
  ESQUADRIA:              "ACABAMENTO",
  ACABAMENTO:             "ACABAMENTO",
  TERRAPLENAGEM:          "TERRAPLENAGEM",
  FUNDACAO:               "FUNDACAO",
  ESTRUTURA:              "ESTRUTURA_ALVENARIA",
  ALVENARIA:              "ESTRUTURA_ALVENARIA",
  LAJE:                   "LAJE",
  COBERTURA:              "COBERTURA",
  OUTROS:                 "OUTROS",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function ceil2(n: number): number {
  return Math.ceil(n * 100) / 100;
}

function findPremise(premises: PremiseValue[], key: string): number {
  const p = premises.find((x) => x.key === key);
  return p ? p.value : 0;
}

function resolveMaterialName(m: MaterialResolver, config: Record<string, unknown>): string {
  return typeof m === "function" ? m(config) : m;
}

// Computed quantity registry — config-aware formulas.
// Returns raw number (not yet scaled by premise).
function computeValue(name: string, config: Record<string, unknown>): number {
  const width  = Number(config.width  ?? 0);
  const height = Number(config.height ?? 0);
  const distance = Number(config.distance ?? 0);
  const ductLength = Number(config.ductLength ?? 0);
  // Cozinha — bancada por m² e frontão por m linear
  const comprimento = Number(config.comprimento ?? 0);
  const profundidade = Number(config.profundidade ?? 0);

  switch (name) {
    case "box.glassArea":         return width * height;
    case "box.perimeter":         return 2 * (width + height);
    case "box.perimeterVedacao":  return 2 * height + width;
    case "chuveiro.cableFase":    return distance; // scaled by CHUVEIRO_CABO_FASE_MULT premise
    case "chuveiro.cableTerra":   return distance;
    case "chuveiro.eletroduto":   return distance; // scaled by CHUVEIRO_ELETRODUTO_MULT
    case "exaustor.duto":         return ductLength; // scaled by EXAUSTOR_DUTO_MULT
    case "window.width":          return width;
    case "window.area":           return width * height;
    case "joinery.width":         return width;
    case "accessory.width":       return width;
    case "accessory.area":        return width * height;
    case "bancada.area":          return comprimento * profundidade;
    case "bancada.frontao":       return comprimento;
    default:                       return 0;
  }
}

function resolveQuantity(
  q: FixtureQuantity,
  config: Record<string, unknown>,
  premises: PremiseValue[],
  count: number
): { value: number; label: string } {
  if ("qty" in q) {
    return { value: q.qty * count, label: count === 1 ? `${q.qty}` : `${count} × ${q.qty}` };
  }
  if ("formula" in q) {
    const key = q.formula.replace(/^premise:/, "");
    const p = findPremise(premises, key);
    const mult = q.multiplier ?? 1;
    return {
      value: p * mult * count,
      label: count === 1 ? `${p} × ${mult}` : `${count} × ${p} × ${mult}`,
    };
  }
  if ("compute" in q) {
    const base = computeValue(q.compute, config);
    let scale = 1;
    if (q.premise) scale *= findPremise(premises, q.premise);
    if (q.multiplier) scale *= q.multiplier;
    const raw = base * (scale === 0 ? 1 : scale);
    return {
      value: raw * count,
      label: count === 1 ? `${q.compute} = ${base.toFixed(2)}${scale !== 1 ? ` × ${scale.toFixed(2)}` : ""}` : `${count} × (${q.compute} = ${base.toFixed(2)})`,
    };
  }
  return { value: 0, label: "0" };
}

// ── Expand a single Fixture ────────────────────────────────────────────────

function expandFixture(
  fixture: FixtureInput,
  room: RoomEngineInput,
  premises: PremiseValue[],
  warnings: string[]
): FixtureMaterialItem[] {
  const spec = getFixtureSpec(fixture.fixtureType);
  if (!spec) {
    warnings.push(`Fixture "${fixture.fixtureType}" não está no catálogo`);
    return [];
  }
  const config = fixture.configJson ? safeJson(fixture.configJson) : {};
  const included = new Set(fixture.includedComponents ?? []);
  const emittedGroups = new Set<string>();

  const items: FixtureMaterialItem[] = [];
  for (const dep of spec.dependencies) {
    if (dep.onlyIf && !dep.onlyIf(config)) continue;
    const materialName = resolveMaterialName(dep.material, config);
    if (dep.canBeIncluded && included.has(materialName)) continue;
    if (dep.exclusionGroup) {
      if (emittedGroups.has(dep.exclusionGroup)) continue;
      emittedGroups.add(dep.exclusionGroup);
    }

    const { value, label } = resolveQuantity(dep.quantity, config, premises, fixture.quantity);
    if (value <= 0) continue;

    const rawFormula = typeof dep.formulaLabel === "function"
      ? dep.formulaLabel(config)
      : dep.formulaLabel ?? label;

    items.push({
      materialName,
      unit: dep.unit,
      category: dep.category,
      phase: CATEGORY_TO_PHASE[dep.category] ?? "OUTROS",
      quantity: ceil2(value),
      roomId: room.id,
      roomName: room.name,
      sourceKind: "FIXTURE",
      sourceId: fixture.id,
      sourceLabel: spec.label,
      formula: rawFormula,
    });
  }
  return items;
}

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}

// ── Expand a bathroom joinery (door or window) ─────────────────────────────

function expandBathroomJoinery(
  joinery: RoomJoineryInput,
  room: RoomEngineInput,
  premises: PremiseValue[]
): FixtureMaterialItem[] {
  // Only joineries with a detailed subtype are handled here; other subtypes
  // fall back to the generic per-total calc (calcAcabamento).
  const isWindow = joinery.joineryType === "JANELA";
  const deps = getJoineryDependencies(joinery.subtype, isWindow);
  if (!deps) return [];
  const sourceLabel = isWindow ? "Janela de banheiro" : "Porta de banheiro";

  // Config: window dimensions + options (tela mosquiteira). Doors use empty config.
  const parsed = joinery.configJson ? safeJson(joinery.configJson) : {};
  const config: Record<string, unknown> = {
    ...parsed,
    width: joinery.width ?? parsed.width ?? 0,
    height: joinery.height ?? parsed.height ?? 0,
  };

  const included = new Set(joinery.includedComponents ?? []);
  const items: FixtureMaterialItem[] = [];
  for (const dep of deps) {
    if (dep.onlyIf && !dep.onlyIf(config)) continue;
    const materialName = resolveMaterialName(dep.material as MaterialResolver, config);
    if (dep.canBeIncluded && included.has(materialName)) continue;
    const { value, label } = resolveQuantity(dep.quantity as FixtureQuantity, config, premises, joinery.quantity);
    if (value <= 0) continue;
    const rawFormula = typeof dep.formulaLabel === "function"
      ? dep.formulaLabel(config)
      : dep.formulaLabel ?? label;
    items.push({
      materialName,
      unit: dep.unit,
      category: dep.category,
      phase: CATEGORY_TO_PHASE[dep.category] ?? "ACABAMENTO",
      quantity: ceil2(value),
      roomId: room.id,
      roomName: room.name,
      sourceKind: "JOINERY",
      sourceId: joinery.id,
      sourceLabel,
      formula: rawFormula,
    });
  }
  return items;
}

// ── Expand an accessory ────────────────────────────────────────────────────

function expandAccessory(
  accessory: AccessoryInput,
  room: RoomEngineInput,
  premises: PremiseValue[],
  warnings: string[]
): FixtureMaterialItem[] {
  const spec = getAccessorySpec(accessory.accessoryType);
  if (!spec) {
    warnings.push(`Acessório "${accessory.accessoryType}" não está no catálogo`);
    return [];
  }
  const config = accessory.configJson ? safeJson(accessory.configJson) : {};

  const items: FixtureMaterialItem[] = [];
  for (const dep of spec.dependencies) {
    if (dep.onlyIf && !dep.onlyIf(config)) continue;

    const { value, label } = resolveQuantity(dep.quantity, config, premises, accessory.quantity);
    if (value <= 0) {
      warnings.push(
        `${room.name}: "${spec.label}" não gerou ${resolveMaterialName(dep.material, config)} (quantidade zero) — confira as dimensões`
      );
      continue;
    }

    const rawFormula = typeof dep.formulaLabel === "function"
      ? dep.formulaLabel(config)
      : dep.formulaLabel ?? label;

    items.push({
      materialName: resolveMaterialName(dep.material, config),
      unit: dep.unit,
      category: dep.category,
      phase: CATEGORY_TO_PHASE[dep.category] ?? "ACABAMENTO",
      quantity: ceil2(value),
      roomId: room.id,
      roomName: room.name,
      sourceKind: "ACCESSORY",
      sourceId: accessory.id,
      sourceLabel: spec.label,
      formula: rawFormula,
    });
  }
  return items;
}

// ── Expand impermeabilization ──────────────────────────────────────────────

// Escopo do padrão econômico: piso + rodapé em todo o perímetro + as duas paredes
// da área do box, quando houver box. Alturas e demãos vêm das Premissas, então
// mudar o coeficiente lá altera o orçamento sem precisar reeditar o ambiente.
export const IMPERM_SCOPE_BASICA = "PISO_PAREDES";

export function impermBasicaArea(
  room: RoomEngineInput,
  premises: PremiseValue[]
): { area: number; rodapeH: number; formula: string } {
  const piso = room.width * room.length;
  const perim = 2 * (room.width + room.length);
  const rodapeH = findPremise(premises, "IMPERM_RODAPE_H");
  const rodape = perim * rodapeH;

  const box = room.fixtures.find(
    (f) => f.fixtureType === "BOX_FRONTAL" || f.fixtureType === "BOX_CANTO"
  );
  let boxArea = 0;
  let boxTxt = "";
  if (box) {
    const cfg = box.configJson ? safeJson(box.configJson) : {};
    const boxW = Number(cfg.width ?? 1);
    const boxH = findPremise(premises, "IMPERM_BOX_H");
    if (boxH > rodapeH) {
      boxArea = boxW * 2 * (boxH - rodapeH);
      boxTxt = ` + box ${boxW} m × 2 × ${(boxH - rodapeH).toFixed(2)} m`;
    }
  }

  return {
    area: piso + rodape + boxArea,
    rodapeH,
    formula: `piso ${piso.toFixed(2)} m² + rodapé ${perim.toFixed(2)} m × ${rodapeH} m${boxTxt}`,
  };
}

function expandImperm(
  imperm: ImpermInput,
  room: RoomEngineInput,
  premises: PremiseValue[],
  warnings: string[]
): FixtureMaterialItem[] {
  if (imperm.scope === "NENHUM") return [];
  const sys = IMPERM_SYSTEMS[imperm.system];
  if (!sys) {
    warnings.push(`Sistema de impermeabilização "${imperm.system}" não catalogado`);
    return [];
  }

  // No escopo básico, área, altura e demãos são derivadas das Premissas —
  // o que estiver gravado no ambiente é só cache da última edição.
  const basica = imperm.scope === IMPERM_SCOPE_BASICA;
  const derived = basica ? impermBasicaArea(room, premises) : null;
  const area = derived ? derived.area : imperm.area;
  const wallHeight = derived ? derived.rodapeH : imperm.wallHeight;
  const coats = basica
    ? (findPremise(premises, "IMPERM_DEMAOS") || imperm.coats || 1)
    : imperm.coats;

  if (area <= 0) return [];

  const items: FixtureMaterialItem[] = [];
  const perimReforcoCantos = (wallHeight > 0)
    ? 2 * (room.width + room.length) // canto piso-parede
    : 0;

  for (const m of sys.materials) {
    let qty = 0;
    let formula = "";

    if (imperm.system === "argamassa_polimerica") {
      if (m.material === "Primer para impermeabilização") {
        qty = area * findPremise(premises, "IMPERM_PRIMER_L_M2");
        formula = `${area.toFixed(2)} m² × ${findPremise(premises, "IMPERM_PRIMER_L_M2")} L/m²`;
      } else if (m.material === "Argamassa polimérica") {
        qty = area * findPremise(premises, "IMPERM_ARGAMASSA_KG_M2_DEMAO") * coats;
        formula = `${area.toFixed(2)} m² × ${findPremise(premises, "IMPERM_ARGAMASSA_KG_M2_DEMAO")} kg × ${coats} demão(s)`;
      } else if (m.material === "Tela de poliéster para reforço") {
        qty = area * findPremise(premises, "IMPERM_TELA_M_M2");
        formula = `${area.toFixed(2)} m² × ${findPremise(premises, "IMPERM_TELA_M_M2")} m/m²`;
      } else if (m.material === "Fita autoadesiva para cantos") {
        qty = perimReforcoCantos * findPremise(premises, "IMPERM_FITA_M_M");
        formula = `perímetro ${perimReforcoCantos.toFixed(2)} m × ${findPremise(premises, "IMPERM_FITA_M_M")} m/m`;
      }
    } else if (imperm.system === "manta_asfaltica") {
      if (m.material === "Primer asfáltico") {
        qty = area * findPremise(premises, "IMPERM_PRIMER_L_M2");
        formula = `${area.toFixed(2)} m² × ${findPremise(premises, "IMPERM_PRIMER_L_M2")} L/m²`;
      } else if (m.material === "Manta asfáltica 4mm") {
        qty = area * findPremise(premises, "IMPERM_MANTA_M2_M2");
        formula = `${area.toFixed(2)} m² × ${findPremise(premises, "IMPERM_MANTA_M2_M2")} (perda)`;
      } else if (m.material === "Reforço para ralo (bota)") {
        qty = imperm.ralos;
        formula = `${imperm.ralos} ralo(s)`;
      }
    }

    if (qty <= 0) continue;
    items.push({
      materialName: m.material,
      unit: m.unit,
      category: m.category,
      phase: CATEGORY_TO_PHASE[m.category] ?? "REVESTIMENTOS",
      quantity: ceil2(qty),
      roomId: room.id,
      roomName: room.name,
      sourceKind: "IMPERM",
      sourceId: `imperm:${room.id}`,
      sourceLabel: `Impermeabilização — ${sys.label}`,
      formula,
    });
  }
  return items;
}

// ── Expand per-wall tile (bathroom custom wall finish) ─────────────────────
// Uses the SAME material names + coefficients as the generic calcRevestimentos,
// so items merge cleanly in the consolidado. The generic calc skips rooms that
// have wall finishes (skipWallTile), preventing double counting.

const WALL_SIDE_LABELS: Record<string, string> = {
  FRENTE: "Frente", FUNDO: "Fundo", ESQUERDA: "Esquerda", DIREITA: "Direita",
  BOX: "Área do box",
  PIA: "Parede da pia",
};

// "BOX" não é um lado do ambiente: representa as duas paredes que formam o
// canto do box, medidas pela largura do próprio box.
// "PIA" também não é um lado — o card da cozinha manda o comprimento explícito
// em wallLength (padrão econômico "só a parede da pia").
function wallLength(room: RoomEngineInput, wall: RoomWallFinishInput): number {
  if (wall.wallLength && wall.wallLength > 0) return wall.wallLength;
  if (wall.wallSide === "BOX") {
    const box = room.fixtures.find(
      (f) => f.fixtureType === "BOX_FRONTAL" || f.fixtureType === "BOX_CANTO"
    );
    const w = box ? Number(safeJson(box.configJson ?? "{}").width ?? 1) : 1;
    return w * 2;
  }
  if (wall.wallSide === "PIA") return room.width; // fallback
  return wall.wallSide === "FRENTE" || wall.wallSide === "FUNDO" ? room.width : room.length;
}

function expandWallFinish(
  room: RoomEngineInput,
  premises: PremiseValue[]
): FixtureMaterialItem[] {
  const walls = (room.wallFinishes ?? []).filter((w) => w.hasTile);
  if (walls.length === 0) return [];

  let area = 0;
  const parts: string[] = [];
  for (const w of walls) {
    const len = wallLength(room, w);
    area += len * w.tileHeight;
    parts.push(`${WALL_SIDE_LABELS[w.wallSide] ?? w.wallSide} ${len.toFixed(2)}×${w.tileHeight.toFixed(2)}`);
  }
  if (area <= 0) return [];

  const LOSS_TILE = 1.10;
  const LOSS_ARG = 1.06;
  const espacador = area * findPremise(premises, "ESPACADOR_POR_M2");

  const mk = (materialName: string, unit: string, category: string, quantity: number, formula: string): FixtureMaterialItem => ({
    materialName, unit, category,
    phase: CATEGORY_TO_PHASE[category] ?? "REVESTIMENTOS",
    quantity: ceil2(quantity),
    roomId: room.id, roomName: room.name,
    sourceKind: "WALLFINISH", sourceId: `wall:${room.id}`,
    sourceLabel: "Revestimento de parede", formula,
  });

  const items: FixtureMaterialItem[] = [
    mk("Revestimento Cerâmico (parede)", "m²", "REVESTIMENTO", Math.ceil(area * LOSS_TILE), `${parts.join(" + ")} = ${area.toFixed(2)} m² × 1,10`),
    // Banheiro é área molhada: AC-III. Cozinha e demais: AC-I.
    mk(argamassaParede(room.roomType, room.name), "sc", "REVESTIMENTO", Math.ceil(area * 0.45), `${area.toFixed(2)} m² × 0,45 sc/m²`),
    mk("Rejunte", "kg", "REVESTIMENTO", Math.ceil(area * 0.4 * LOSS_ARG), `${area.toFixed(2)} m² × 0,40 kg/m² × 1,06`),
  ];
  if (espacador > 0) {
    items.push(mk("Espaçador para revestimento", "pct", "REVESTIMENTO", espacador, `${area.toFixed(2)} m² × ${findPremise(premises, "ESPACADOR_POR_M2")} pct/m²`));
  }
  return items;
}

// ── Public API ─────────────────────────────────────────────────────────────

export type EngineResult = {
  items: FixtureMaterialItem[];
  warnings: string[];
};

export function resolveRoomFixtures(
  rooms: RoomEngineInput[],
  premises: PremiseValue[]
): EngineResult {
  const warnings: string[] = [];
  const items: FixtureMaterialItem[] = [];
  for (const room of rooms) {
    for (const fx of room.fixtures) items.push(...expandFixture(fx, room, premises, warnings));
    for (const j of room.joineries) items.push(...expandBathroomJoinery(j, room, premises));
    for (const a of room.accessories) items.push(...expandAccessory(a, room, premises, warnings));
    if (room.imperm) items.push(...expandImperm(room.imperm, room, premises, warnings));
    items.push(...expandWallFinish(room, premises));
  }
  return { items, warnings };
}

// Aggregate the point requirements of all fixtures in a room (for validation / auto-fill).
export type PointDemand = {
  roomId: string;
  hydraulic: Record<string, number>;   // AGUA_FRIA | AGUA_QUENTE | ESGOTO_40 | ESGOTO_50 | ESGOTO_100 | RALO
  electrical: Record<string, number>;  // TOMADA | INTERRUPTOR | PONTO_LUZ | CIRCUITO_EXCLUSIVO
};

export function computePointDemand(rooms: RoomEngineInput[]): PointDemand[] {
  const out: PointDemand[] = [];
  for (const room of rooms) {
    const hydraulic: Record<string, number> = {};
    const electrical: Record<string, number> = {};
    for (const fx of room.fixtures) {
      const spec = getFixtureSpec(fx.fixtureType);
      if (!spec) continue;
      const config = fx.configJson ? safeJson(fx.configJson) : {};
      for (const p of spec.hydraulicPoints) {
        if (p.onlyIf && !p.onlyIf(config)) continue;
        hydraulic[p.type] = (hydraulic[p.type] ?? 0) + p.qty * fx.quantity;
      }
      for (const p of spec.electricalPoints) {
        if (p.onlyIf && !p.onlyIf(config)) continue;
        electrical[p.type] = (electrical[p.type] ?? 0) + p.qty * fx.quantity;
      }
    }
    out.push({ roomId: room.id, hydraulic, electrical });
  }
  return out;
}
