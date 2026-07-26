// Types shared by the fixture library and the calculation engine.
// A "fixture" is an installed equipment (vaso, lavatório, chuveiro, ralo, box, …).
// A fixture has:
//   - required hydraulic/electric points (feeds the point validation & counting)
//   - material dependencies (the shopping list generated when the fixture is present)

export type HydraulicPointKind =
  | "AGUA_FRIA"
  | "AGUA_QUENTE"
  | "ESGOTO_40"
  | "ESGOTO_50"
  | "ESGOTO_100"
  | "RALO";

export type ElectricalPointKind =
  | "TOMADA"
  | "INTERRUPTOR"
  | "PONTO_LUZ"
  | "CIRCUITO_EXCLUSIVO";

// Quantities can be:
//   - a literal number: { qty: 1 }
//   - a premise-scaled formula: { formula: "premise:KEY", multiplier?: number }
//     resolved as: (globalPremise.value * multiplier).
//   - a computed helper name resolved by the engine, optionally scaled by a premise
//     e.g. { compute: "box.glassArea", premise: "IMPERM_MANTA_M2_M2" }
export type FixtureQuantity =
  | { qty: number }
  | { formula: `premise:${string}`; multiplier?: number }
  | { compute: string; premise?: string; multiplier?: number };

// A dependency's material name can be static, or derived from the fixture config
// (e.g. cable gauge depends on config.cableSize for the electric shower).
export type MaterialResolver =
  | string
  | ((config: Record<string, unknown>) => string);

export type PointRequirement = {
  type: HydraulicPointKind | ElectricalPointKind;
  qty: number;
  onlyIf?: (config: Record<string, unknown>) => boolean;
};

export type DependencySpec = {
  material: MaterialResolver; // canonical name in the Material catalog, or a resolver f(config)
  unit: string;               // fallback if material must be auto-created
  category: string;           // MaterialCategory fallback if auto-created
  quantity: FixtureQuantity;
  required?: boolean;         // default true
  canBeIncluded?: boolean;    // if user marks it as "already included", skip
  exclusionGroup?: string;    // among items with same group, only one is emitted
  onlyIf?: (config: Record<string, unknown>) => boolean; // conditional inclusion
  // A short human-readable formula shown in the memory-of-calc column.
  // If omitted, the engine builds a default one ("N × item" or "premise × N").
  formulaLabel?: string | ((config: Record<string, unknown>) => string);
};

export type FixtureSpec = {
  fixtureType: string;   // matches Prisma FixtureType enum value
  label: string;         // human name shown in UI
  description?: string;
  hydraulicPoints: PointRequirement[];
  electricalPoints: PointRequirement[];
  dependencies: DependencySpec[];
  // Config schema — describes what dimensions/options this fixture accepts
  configSchema?: Record<string, {
    label: string;
    type: "number" | "string" | "boolean" | "enum";
    default?: unknown;
    options?: string[];
    unit?: string;
  }>;
};
