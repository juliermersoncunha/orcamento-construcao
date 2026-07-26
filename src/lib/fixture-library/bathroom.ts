// Bathroom fixture library — canonical definitions of what each installed
// equipment demands (points + material dependencies).
//
// Editable via code review; premise-scaled formulas are pulled from GlobalPremise
// at runtime so consumption coefficients stay editable in /admin/premissas.
//
// No formula, coefficient or material name is hard-coded elsewhere — everything
// flows through this file into the engine.

import type { FixtureSpec } from "./types";

export const BATHROOM_FIXTURES: FixtureSpec[] = [
  // ── VASO SANITÁRIO ────────────────────────────────────────────────────────
  {
    fixtureType: "VASO_CAIXA_ACOPLADA",
    label: "Vaso sanitário com caixa acoplada",
    hydraulicPoints: [
      { type: "AGUA_FRIA",  qty: 1 },
      { type: "ESGOTO_100", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Bacia sanitária com caixa acoplada", unit: "cj",  category: "LOUCAS_SANITARIAS",     quantity: { qty: 1 } },
      { material: "Assento sanitário",                  unit: "un",  category: "LOUCAS_SANITARIAS",     quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Anel de vedação para vaso",          unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Kit fixação de vaso",                unit: "kit", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Engate flexível PVC 30cm",           unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Registro angular 1/2\" x 1/2\"",     unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 } },
      { material: "Fita veda-rosca",                    unit: "rolo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 3 } },
      { material: "Silicone sanitário",                 unit: "tubo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
    ],
  },
  {
    fixtureType: "VASO_VALVULA",
    label: "Vaso sanitário com válvula",
    hydraulicPoints: [
      { type: "AGUA_FRIA",  qty: 1 },
      { type: "ESGOTO_100", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Bacia sanitária convencional",           unit: "un",  category: "LOUCAS_SANITARIAS",     quantity: { qty: 1 } },
      { material: "Válvula de descarga",                    unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 } },
      { material: "Acabamento de válvula de descarga",      unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 } },
      { material: "Assento sanitário",                       unit: "un",  category: "LOUCAS_SANITARIAS",     quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Anel de vedação para vaso",              unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Kit fixação de vaso",                    unit: "kit", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Fita veda-rosca",                        unit: "rolo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 3 } },
      { material: "Silicone sanitário",                     unit: "tubo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
    ],
  },

  // ── LAVATÓRIO / CUBA ──────────────────────────────────────────────────────
  {
    fixtureType: "LAVATORIO_SUSPENSO",
    label: "Lavatório suspenso",
    configSchema: {
      hotWater: { label: "Com água quente", type: "boolean", default: false },
    },
    hydraulicPoints: [
      { type: "AGUA_FRIA", qty: 1 },
      { type: "ESGOTO_50", qty: 1 },
      { type: "AGUA_QUENTE", qty: 1, onlyIf: (c) => c.hotWater === true },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Lavatório suspenso",             unit: "un",  category: "LOUCAS_SANITARIAS",     quantity: { qty: 1 } },
      { material: "Torneira para lavatório",        unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 }, onlyIf: (c) => c.hotWater !== true },
      { material: "Misturador monocomando lavatório", unit: "un", category: "METAIS_SANITARIOS",   quantity: { qty: 1 }, onlyIf: (c) => c.hotWater === true },
      { material: "Válvula de escoamento",          unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 } },
      { material: "Sifão sanfonado",                unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Engate flexível PVC 30cm",       unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 }, onlyIf: (c) => c.hotWater !== true },
      { material: "Engate flexível PVC 30cm",       unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 2 }, onlyIf: (c) => c.hotWater === true },
      { material: "Registro angular 1/2\" x 1/2\"", unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 }, onlyIf: (c) => c.hotWater !== true },
      { material: "Registro angular 1/2\" x 1/2\"", unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 2 }, onlyIf: (c) => c.hotWater === true },
      { material: "Kit fixação de lavatório",       unit: "kit", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Fita veda-rosca",                unit: "rolo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 4 } },
      { material: "Silicone sanitário",             unit: "tubo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
    ],
  },
  {
    fixtureType: "LAVATORIO_COLUNA",
    label: "Lavatório com coluna",
    configSchema: {
      hotWater: { label: "Com água quente", type: "boolean", default: false },
    },
    hydraulicPoints: [
      { type: "AGUA_FRIA", qty: 1 },
      { type: "ESGOTO_50", qty: 1 },
      { type: "AGUA_QUENTE", qty: 1, onlyIf: (c) => c.hotWater === true },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Lavatório com coluna",             unit: "cj",  category: "LOUCAS_SANITARIAS",     quantity: { qty: 1 } },
      { material: "Torneira para lavatório",          unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 }, onlyIf: (c) => c.hotWater !== true },
      { material: "Misturador monocomando lavatório", unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 }, onlyIf: (c) => c.hotWater === true },
      { material: "Válvula de escoamento",            unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 } },
      { material: "Sifão sanfonado",                  unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Engate flexível PVC 30cm",         unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 }, onlyIf: (c) => c.hotWater !== true },
      { material: "Engate flexível PVC 30cm",         unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 2 }, onlyIf: (c) => c.hotWater === true },
      { material: "Registro angular 1/2\" x 1/2\"",   unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 }, onlyIf: (c) => c.hotWater !== true },
      { material: "Registro angular 1/2\" x 1/2\"",   unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 2 }, onlyIf: (c) => c.hotWater === true },
      { material: "Kit fixação de lavatório",         unit: "kit", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Fita veda-rosca",                  unit: "rolo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 4 } },
      { material: "Silicone sanitário",               unit: "tubo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
    ],
  },

  // ── CHUVEIRO / DUCHA ──────────────────────────────────────────────────────
  {
    fixtureType: "CHUVEIRO_ELETRICO",
    label: "Chuveiro elétrico",
    configSchema: {
      voltage:  { label: "Tensão (V)",       type: "enum",   options: ["127", "220"], default: "220" },
      powerW:   { label: "Potência (W)",     type: "number", default: 5500, unit: "W" },
      distance: { label: "Distância ao quadro (m)", type: "number", default: 8, unit: "m" },
      cableSize:{ label: "Bitola do cabo (mm²)", type: "enum", options: ["4", "6", "10"], default: "6", unit: "mm²" },
    },
    hydraulicPoints: [
      { type: "AGUA_FRIA", qty: 1 },
    ],
    electricalPoints: [
      { type: "CIRCUITO_EXCLUSIVO", qty: 1 },
    ],
    dependencies: [
      { material: "Chuveiro elétrico",                  unit: "un",  category: "ELETRICA",              quantity: { qty: 1 } },
      { material: "Registro de pressão 3/4\"",         unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 } },
      { material: "Acabamento de registro",             unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 } },
      { material: "Fita veda-rosca",                    unit: "rolo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 2 } },
      { material: "Disjuntor monopolar exclusivo",      unit: "un",  category: "ELETRICA",              quantity: { qty: 1 } },
      // Circuito exclusivo — bitola do cabo vem do config; comprimento = 2 × distância (fase+neutro) × mult
      {
        material: (c) => `Cabo flexível ${(c.cableSize ?? "6")}mm²`,
        unit: "m", category: "ELETRICA",
        quantity: { compute: "chuveiro.cableFase", premise: "CHUVEIRO_CABO_FASE_MULT" },
        formulaLabel: (c) => `2 × ${c.distance ?? 8} m (fase+neutro) × mult`,
      },
      {
        material: (c) => `Cabo flexível ${(c.cableSize ?? "6")}mm² (terra)`,
        unit: "m", category: "ELETRICA",
        quantity: { compute: "chuveiro.cableTerra" },
        formulaLabel: (c) => `1 × ${c.distance ?? 8} m (terra)`,
      },
      {
        material: "Eletroduto rígido 3/4\"",
        unit: "m", category: "ELETRICA",
        quantity: { compute: "chuveiro.eletroduto", premise: "CHUVEIRO_ELETRODUTO_MULT" },
        formulaLabel: (c) => `${c.distance ?? 8} m × mult`,
      },
    ],
  },
  {
    fixtureType: "DUCHA_FRIA",
    label: "Ducha (somente água fria)",
    hydraulicPoints: [
      { type: "AGUA_FRIA", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Ducha manual/higiênica",             unit: "un", category: "METAIS_SANITARIOS",      quantity: { qty: 1 } },
      { material: "Registro de pressão 3/4\"",         unit: "un", category: "METAIS_SANITARIOS",      quantity: { qty: 1 } },
      { material: "Acabamento de registro",             unit: "un", category: "METAIS_SANITARIOS",      quantity: { qty: 1 } },
      { material: "Braço para chuveiro",                unit: "un", category: "METAIS_SANITARIOS",      quantity: { qty: 1 } },
      { material: "Canopla cromada",                    unit: "un", category: "METAIS_SANITARIOS",      quantity: { qty: 1 } },
      { material: "Fita veda-rosca",                    unit: "rolo", category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 2 } },
    ],
  },
  {
    fixtureType: "DUCHA_QUENTE",
    label: "Ducha com água quente (misturador)",
    hydraulicPoints: [
      { type: "AGUA_FRIA",   qty: 1 },
      { type: "AGUA_QUENTE", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Misturador monocomando ducha",       unit: "un", category: "METAIS_SANITARIOS",      quantity: { qty: 1 } },
      { material: "Registro de pressão 3/4\"",         unit: "un", category: "METAIS_SANITARIOS",      quantity: { qty: 2 } },
      { material: "Acabamento de registro",             unit: "un", category: "METAIS_SANITARIOS",      quantity: { qty: 2 } },
      { material: "Braço para chuveiro",                unit: "un", category: "METAIS_SANITARIOS",      quantity: { qty: 1 } },
      { material: "Canopla cromada",                    unit: "un", category: "METAIS_SANITARIOS",      quantity: { qty: 1 } },
      { material: "Fita veda-rosca",                    unit: "rolo", category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 3 } },
    ],
  },

  // ── RALO / CAIXA SIFONADA ─────────────────────────────────────────────────
  {
    fixtureType: "CAIXA_SIFONADA",
    label: "Caixa sifonada",
    hydraulicPoints: [
      { type: "RALO", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Caixa sifonada 100mm",  unit: "un", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Grelha para caixa sifonada", unit: "un", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Silicone sanitário",    unit: "tubo", category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
    ],
  },
  {
    fixtureType: "RALO_SIFONADO",
    label: "Ralo sifonado",
    hydraulicPoints: [
      { type: "RALO", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Ralo sifonado 100mm", unit: "un", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Grelha 10x10cm",       unit: "un", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Silicone sanitário",  unit: "tubo", category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
    ],
  },
  {
    fixtureType: "RALO_SECO",
    label: "Ralo seco",
    hydraulicPoints: [
      { type: "RALO", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Ralo seco 100mm",     unit: "un", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Grelha 10x10cm",       unit: "un", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Silicone sanitário",  unit: "tubo", category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
    ],
  },
  {
    fixtureType: "RALO_LINEAR",
    label: "Ralo linear",
    configSchema: {
      length: { label: "Comprimento (m)", type: "number", default: 0.60, unit: "m" },
    },
    hydraulicPoints: [
      { type: "RALO", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Ralo linear inox",     unit: "un", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Silicone sanitário",  unit: "tubo", category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
    ],
  },

  // ── DUCHA HIGIÊNICA ───────────────────────────────────────────────────────
  {
    fixtureType: "DUCHA_HIGIENICA",
    label: "Ducha higiênica",
    hydraulicPoints: [
      { type: "AGUA_FRIA", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Kit ducha higiênica",         unit: "kit", category: "METAIS_SANITARIOS", quantity: { qty: 1 } },
      { material: "Registro 1/2\" gaveta",       unit: "un",  category: "METAIS_SANITARIOS", quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Conexão de parede",            unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Fita veda-rosca",              unit: "rolo", category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 2 } },
    ],
  },

  // ── BOX ────────────────────────────────────────────────────────────────────
  {
    fixtureType: "BOX_FRONTAL",
    label: "Box frontal",
    configSchema: {
      width:      { label: "Largura (m)",  type: "number", default: 1.00, unit: "m" },
      height:     { label: "Altura (m)",   type: "number", default: 1.90, unit: "m" },
      glassMm:    { label: "Vidro (mm)",   type: "enum", options: ["6", "8", "10"], default: "8", unit: "mm" },
      opening:    { label: "Abertura",     type: "enum", options: ["correr", "abrir"], default: "correr" },
      priceMode:  { label: "Preço por",    type: "enum", options: ["conjunto", "m2"], default: "conjunto" },
    },
    hydraulicPoints: [],
    electricalPoints: [],
    dependencies: [
      {
        material: (c) => `Vidro temperado incolor ${c.glassMm ?? "8"}mm`,
        unit: "m²", category: "VIDROS_BOX",
        quantity: { compute: "box.glassArea" },
        formulaLabel: (c) => `${c.width ?? 1} m × ${c.height ?? 1.9} m`,
      },
      {
        material: "Perfil de alumínio para box",
        unit: "m", category: "VIDROS_BOX",
        quantity: { compute: "box.perimeter" },
        formulaLabel: (c) => `perímetro = 2 × (${c.width ?? 1} + ${c.height ?? 1.9})`,
      },
      { material: "Roldana para box de correr",  unit: "cj",  category: "VIDROS_BOX", quantity: { qty: 1 }, onlyIf: (c) => c.opening === "correr" },
      { material: "Dobradiça para box",           unit: "un",  category: "VIDROS_BOX", quantity: { qty: 2 }, onlyIf: (c) => c.opening === "abrir" },
      { material: "Puxador de box",                unit: "un",  category: "VIDROS_BOX", quantity: { qty: 1 } },
      {
        material: "Borracha de vedação para box",
        unit: "m", category: "VIDROS_BOX",
        quantity: { compute: "box.perimeterVedacao" },
        formulaLabel: (c) => `2 × ${c.height ?? 1.9} + ${c.width ?? 1}`,
      },
      { material: "Kit fixação de box",            unit: "kit", category: "VIDROS_BOX",              quantity: { qty: 1 } },
      { material: "Silicone sanitário",             unit: "tubo", category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO", multiplier: 2 } },
    ],
  },

  // ── EXAUSTOR ──────────────────────────────────────────────────────────────
  {
    fixtureType: "EXAUSTOR",
    label: "Exaustor de banheiro",
    configSchema: {
      ductLength: { label: "Comprimento do duto (m)", type: "number", default: 3, unit: "m" },
    },
    hydraulicPoints: [],
    electricalPoints: [
      { type: "PONTO_LUZ", qty: 1 },
    ],
    dependencies: [
      { material: "Exaustor de banheiro",           unit: "un", category: "ELETRICA", quantity: { qty: 1 } },
      {
        material: "Duto flexível para exaustor",
        unit: "m", category: "ELETRICA",
        quantity: { compute: "exaustor.duto", premise: "EXAUSTOR_DUTO_MULT" },
        formulaLabel: (c) => `${c.ductLength ?? 3} m × mult`,
      },
      { material: "Grelha externa para exaustor",   unit: "un", category: "ELETRICA", quantity: { qty: 1 } },
    ],
  },
];

// Preset — "Banheiro completo padrão"
export const BATHROOM_STANDARD_PRESET = [
  { fixtureType: "VASO_CAIXA_ACOPLADA", quantity: 1 },
  { fixtureType: "LAVATORIO_SUSPENSO",  quantity: 1, config: { hotWater: false } },
  { fixtureType: "CHUVEIRO_ELETRICO",   quantity: 1, config: { voltage: "220", powerW: 5500, distance: 8, cableSize: "6" } },
  { fixtureType: "CAIXA_SIFONADA",      quantity: 1 },
] as const;

// Joinery preset for bathroom door
export const BATHROOM_DOOR_PRESET = {
  joineryType: "PORTA_INTERNA" as const,
  subtype: "banheiro",
  width: 0.70,
  height: 2.10,
  material: "madeira",
  quantity: 1,
  prefinished: false,
  includedComponents: [] as string[],
};

// Materials generated by a bathroom door (independent of Fixture, keyed by joinery)
export const BATHROOM_DOOR_DEPENDENCIES = [
  { material: "Folha de porta interna",                 unit: "un",   category: "ESQUADRIA",              quantity: { qty: 1 } },
  { material: "Batente / marco de porta",               unit: "un",   category: "ESQUADRIA",              quantity: { qty: 1 }, canBeIncluded: true },
  { material: "Kit de alisar (guarnição)",              unit: "kit",  category: "ESQUADRIA",              quantity: { qty: 1 }, canBeIncluded: true },
  { material: "Kit 3 dobradiças",                        unit: "kit",  category: "ESQUADRIA",              quantity: { qty: 1 } },
  { material: "Fechadura banheiro (privacidade)",       unit: "un",   category: "ESQUADRIA",              quantity: { qty: 1 } },
  { material: "Kit parafusos e buchas para porta",     unit: "kit",  category: "ESQUADRIA",              quantity: { qty: 1 } },
  { material: "Espuma expansiva PU 500ml",              unit: "un",   category: "ESQUADRIA",              quantity: { formula: "premise:ESPUMA_POR_PORTA" } },
];

// Accessories (opt-in, individually)
export const BATHROOM_ACCESSORIES = [
  { type: "ESPELHO",             label: "Espelho" },
  { type: "GABINETE",            label: "Gabinete" },
  { type: "ARMARIO",             label: "Armário" },
  { type: "PORTA_PAPEL",         label: "Porta-papel higiênico" },
  { type: "TOALHEIRO_ROSTO",     label: "Toalheiro de rosto" },
  { type: "TOALHEIRO_BANHO",     label: "Toalheiro de banho" },
  { type: "GANCHO",              label: "Gancho" },
  { type: "SABONETEIRA",         label: "Saboneteira" },
  { type: "PORTA_SHAMPOO",       label: "Porta-shampoo" },
  { type: "PRATELEIRA",          label: "Prateleira" },
  { type: "NICHO",               label: "Nicho" },
  { type: "LIXEIRA",             label: "Lixeira" },
  { type: "BARRA_APOIO",         label: "Barra de apoio" },
] as const;

export const BATHROOM_ACCESSORY_DEPENDENCIES: Record<string, {
  material: string; unit: string; category: string; quantity: { qty: number } | { formula: string; multiplier?: number };
}[]> = {
  ESPELHO: [
    { material: "Espelho comum 4mm",       unit: "m²", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } },
    { material: "Kit fixação para espelho", unit: "kit",category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } },
    { material: "Silicone sanitário",        unit: "tubo", category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
  ],
  PORTA_PAPEL:     [{ material: "Porta-papel higiênico",    unit: "un", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }, { material: "Kit parafusos e buchas", unit: "kit", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }],
  TOALHEIRO_ROSTO: [{ material: "Toalheiro de rosto",       unit: "un", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }, { material: "Kit parafusos e buchas", unit: "kit", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }],
  TOALHEIRO_BANHO: [{ material: "Toalheiro de banho",       unit: "un", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }, { material: "Kit parafusos e buchas", unit: "kit", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }],
  GANCHO:          [{ material: "Gancho de parede",          unit: "un", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }, { material: "Kit parafusos e buchas", unit: "kit", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }],
  SABONETEIRA:     [{ material: "Saboneteira",                unit: "un", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }, { material: "Kit parafusos e buchas", unit: "kit", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }],
  PORTA_SHAMPOO:   [{ material: "Porta-shampoo",              unit: "un", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }, { material: "Kit parafusos e buchas", unit: "kit", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }],
  PRATELEIRA:      [{ material: "Prateleira de vidro",         unit: "un", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }, { material: "Kit parafusos e buchas", unit: "kit", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }],
  LIXEIRA:         [{ material: "Lixeira de banheiro",         unit: "un", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }],
  BARRA_APOIO:     [{ material: "Barra de apoio para banheiro", unit: "un", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }, { material: "Kit fixação reforçado", unit: "kit", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } }],
};

// Impermeabilization systems
export const IMPERM_SYSTEMS: Record<string, {
  label: string;
  materials: {
    material: string;
    unit: string;
    category: string;
    // qty per m² per coat, plus reinforcements per m of wall/edge and per ralo/tubo
    perM2Coat?: number;   // e.g. argamassa 1 kg/m²/demão
    perM2Once?: number;   // primer (single application)
    perMReinforce?: number; // tela/fita ao longo dos cantos e ao redor dos ralos
    perRalo?: number;
    perTubo?: number;
  }[];
}> = {
  argamassa_polimerica: {
    label: "Argamassa polimérica",
    materials: [
      { material: "Primer para impermeabilização",    unit: "L",  category: "IMPERMEABILIZACAO", perM2Once: undefined },
      { material: "Argamassa polimérica",             unit: "kg", category: "IMPERMEABILIZACAO", perM2Coat: undefined },
      { material: "Tela de poliéster para reforço",  unit: "m",  category: "IMPERMEABILIZACAO", perMReinforce: undefined },
      { material: "Fita autoadesiva para cantos",     unit: "m",  category: "IMPERMEABILIZACAO", perMReinforce: undefined },
    ],
  },
  manta_asfaltica: {
    label: "Manta asfáltica",
    materials: [
      { material: "Primer asfáltico",                unit: "L",  category: "IMPERMEABILIZACAO", perM2Once: undefined },
      { material: "Manta asfáltica 4mm",              unit: "m²", category: "IMPERMEABILIZACAO", perM2Coat: undefined },
      { material: "Reforço para ralo (bota)",         unit: "un", category: "IMPERMEABILIZACAO", perRalo: 1 },
    ],
  },
};

// Get a fixture spec by type
export function getBathroomFixtureSpec(fixtureType: string): FixtureSpec | undefined {
  return BATHROOM_FIXTURES.find((f) => f.fixtureType === fixtureType);
}

// UI grouping for the "adicionar equipamento" dropdown.
export const BATHROOM_FIXTURE_GROUPS: { label: string; types: string[] }[] = [
  { label: "Vaso sanitário", types: ["VASO_CAIXA_ACOPLADA", "VASO_VALVULA"] },
  { label: "Lavatório / cuba", types: ["LAVATORIO_SUSPENSO", "LAVATORIO_COLUNA"] },
  { label: "Chuveiro / ducha", types: ["CHUVEIRO_ELETRICO", "DUCHA_FRIA", "DUCHA_QUENTE"] },
  { label: "Ralo / caixa sifonada", types: ["CAIXA_SIFONADA", "RALO_SIFONADO", "RALO_SECO", "RALO_LINEAR"] },
  { label: "Ducha higiênica", types: ["DUCHA_HIGIENICA"] },
  { label: "Box", types: ["BOX_FRONTAL"] },
  { label: "Exaustor", types: ["EXAUSTOR"] },
];

// List of components a fixture *can* have "já incluso no produto" — for the checkboxes.
// Returns the resolved material names given the current config.
export function includableComponents(
  fixtureType: string,
  config: Record<string, unknown>
): string[] {
  const spec = getBathroomFixtureSpec(fixtureType);
  if (!spec) return [];
  const out: string[] = [];
  for (const dep of spec.dependencies) {
    if (!dep.canBeIncluded) continue;
    if (dep.onlyIf && !dep.onlyIf(config)) continue;
    const name = typeof dep.material === "function" ? dep.material(config) : dep.material;
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

// Human labels for room (bathroom) types.
export const BATHROOM_ROOM_TYPES: { value: string; label: string }[] = [
  { value: "BANHEIRO", label: "Banheiro social" },
  { value: "LAVABO", label: "Lavabo" },
  { value: "BANHEIRO_SUITE", label: "Banheiro de suíte" },
  { value: "BANHEIRO_SERVICO", label: "Banheiro de serviço" },
];

export const BATHROOM_ROOM_TYPE_SET = new Set(BATHROOM_ROOM_TYPES.map((t) => t.value));
