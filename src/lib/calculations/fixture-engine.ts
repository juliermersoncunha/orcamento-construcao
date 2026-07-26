// Fixture engine — resolves a `Fixture` (installed equipment) into a flat list of
// material items with source, formula and quantity.
//
// Pure function (no I/O): receives loaded Materials + Premises + Fixtures.
// Emits `FixtureMaterialItem[]` compatible with the existing report structure.
//
// Does NOT touch existing per-phase calculations. The room-aware report merges
// these items into "Materiais por Ambiente"; consolidation happens on the report side.

import { BATHROOM_FIXTURES, BATHROOM_DOOR_DEPENDENCIES, BATHROOM_ACCESSORY_DEPENDENCIES, IMPERM_SYSTEMS } from "@/lib/fixture-library/bathroom";
import type { FixtureQuantity, DependencySpec, MaterialResolver } from "@/lib/fixture-library/types";

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
};

export type AccessoryInput = {
  id: string;
  roomId: string;
  accessoryType: string;
  quantity: number;
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
  sourceKind: "FIXTURE" | "JOINERY" | "ACCESSORY" | "IMPERM";
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

  switch (name) {
    case "box.glassArea":         return width * height;
    case "box.perimeter":         return 2 * (width + height);
    case "box.perimeterVedacao":  return 2 * height + width;
    case "chuveiro.cableFase":    return distance; // scaled by CHUVEIRO_CABO_FASE_MULT premise
    case "chuveiro.cableTerra":   return distance;
    case "chuveiro.eletroduto":   return distance; // scaled by CHUVEIRO_ELETRODUTO_MULT
    case "exaustor.duto":         return ductLength; // scaled by EXAUSTOR_DUTO_MULT
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
  const spec = BATHROOM_FIXTURES.find((f) => f.fixtureType === fixture.fixtureType);
  if (!spec) {
    warnings.push(`Fixture "${fixture.fixtureType}" não está no catálogo do banheiro`);
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

// ── Expand a bathroom door ─────────────────────────────────────────────────

function expandBathroomDoor(
  joinery: RoomJoineryInput,
  room: RoomEngineInput,
  premises: PremiseValue[]
): FixtureMaterialItem[] {
  // Only bathroom doors get privacy lock; other subtypes fall back to generic (calcAcabamento)
  if (joinery.subtype !== "banheiro") return [];
  const included = new Set(joinery.includedComponents ?? []);
  const items: FixtureMaterialItem[] = [];
  const config = {};
  for (const dep of BATHROOM_DOOR_DEPENDENCIES) {
    const materialName = resolveMaterialName(dep.material as MaterialResolver, config);
    if (dep.canBeIncluded && included.has(materialName)) continue;
    const { value, label } = resolveQuantity(dep.quantity as FixtureQuantity, config, premises, joinery.quantity);
    if (value <= 0) continue;
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
      sourceLabel: "Porta de banheiro",
      formula: label,
    });
  }
  return items;
}

// ── Expand an accessory ────────────────────────────────────────────────────

function expandAccessory(
  accessory: AccessoryInput,
  room: RoomEngineInput,
  premises: PremiseValue[]
): FixtureMaterialItem[] {
  const deps = BATHROOM_ACCESSORY_DEPENDENCIES[accessory.accessoryType];
  if (!deps) return [];
  const items: FixtureMaterialItem[] = [];
  for (const dep of deps) {
    const { value, label } = resolveQuantity(dep.quantity as FixtureQuantity, {}, premises, accessory.quantity);
    if (value <= 0) continue;
    items.push({
      materialName: dep.material,
      unit: dep.unit,
      category: dep.category,
      phase: CATEGORY_TO_PHASE[dep.category] ?? "ACABAMENTO",
      quantity: ceil2(value),
      roomId: room.id,
      roomName: room.name,
      sourceKind: "ACCESSORY",
      sourceId: accessory.id,
      sourceLabel: accessory.accessoryType,
      formula: label,
    });
  }
  return items;
}

// ── Expand impermeabilization ──────────────────────────────────────────────

function expandImperm(
  imperm: ImpermInput,
  room: RoomEngineInput,
  premises: PremiseValue[],
  warnings: string[]
): FixtureMaterialItem[] {
  if (imperm.scope === "NENHUM" || imperm.area <= 0) return [];
  const sys = IMPERM_SYSTEMS[imperm.system];
  if (!sys) {
    warnings.push(`Sistema de impermeabilização "${imperm.system}" não catalogado`);
    return [];
  }

  const items: FixtureMaterialItem[] = [];
  const area = imperm.area;
  const perimReforcoCantos = (imperm.wallHeight > 0)
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
        qty = area * findPremise(premises, "IMPERM_ARGAMASSA_KG_M2_DEMAO") * imperm.coats;
        formula = `${area.toFixed(2)} m² × ${findPremise(premises, "IMPERM_ARGAMASSA_KG_M2_DEMAO")} kg × ${imperm.coats} demão(s)`;
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
    for (const j of room.joineries) items.push(...expandBathroomDoor(j, room, premises));
    for (const a of room.accessories) items.push(...expandAccessory(a, room, premises));
    if (room.imperm) items.push(...expandImperm(room.imperm, room, premises, warnings));
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
      const spec = BATHROOM_FIXTURES.find((f) => f.fixtureType === fx.fixtureType);
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
