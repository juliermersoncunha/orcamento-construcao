// Bathroom fixture library — canonical definitions of what each installed
// equipment demands (points + material dependencies).
//
// Editable via code review; premise-scaled formulas are pulled from GlobalPremise
// at runtime so consumption coefficients stay editable in /admin/premissas.
//
// No formula, coefficient or material name is hard-coded elsewhere — everything
// flows through this file into the engine.

import type { FixtureSpec, DependencySpec, AccessorySpec, ConfigSchema } from "./types";

// Bitola do circuito do chuveiro, derivada da corrente (P/V) em vez de perguntada.
// Faixas dimensionadas para o uso residencial econômico: 220 V / 5500 W cai em
// 6 mm², que é o que o mercado pratica considerando queda de tensão no ramal.
export function chuveiroCabo(config: Record<string, unknown>): string {
  const powerW = Number(config.powerW ?? 5500);
  const voltage = Number(config.voltage ?? 220) || 220;
  const amps = powerW / voltage;
  if (amps < 22) return "4";
  if (amps < 40) return "6";
  return "10";
}

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
    advanced: true,
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
    // Sem configSchema no padrão econômico: não há água quente. As dependências
    // com `hotWater` continuam declaradas para não quebrar projetos antigos que
    // gravaram a opção, mas nada na interface consegue mais ligá-la.
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
    advanced: true,
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
      // Circuito exclusivo — bitola derivada da potência; comprimento = 2 × distância (fase+neutro) × mult
      {
        material: (c) => `Cabo flexível ${chuveiroCabo(c)}mm²`,
        unit: "m", category: "ELETRICA",
        quantity: { compute: "chuveiro.cableFase", premise: "CHUVEIRO_CABO_FASE_MULT" },
        formulaLabel: (c) => `2 × ${c.distance ?? 8} m (fase+neutro) × mult`,
      },
      {
        material: (c) => `Cabo flexível ${chuveiroCabo(c)}mm² (terra)`,
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
    advanced: true,
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
    advanced: true,
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
    advanced: true,
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
    advanced: true,
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
    optional: true,
    shortLabel: "Ducha higiênica",
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
    optional: true,
    shortLabel: "Box de vidro",
    label: "Box frontal",
    configSchema: {
      width:      { label: "Largura (m)",  type: "number", default: 1.00, unit: "m" },
      height:     { label: "Altura (m)",   type: "number", default: 1.90, unit: "m" },
      priceMode:  { label: "Preço por",    type: "enum", options: ["conjunto", "m2"], default: "conjunto" },
    },
    hydraulicPoints: [],
    electricalPoints: [],
    // Conjunto fechado: perfis, roldanas, puxador e borracha vêm com o box.
    // Só o modo de preço muda a composição — por peça inteira ou por m² de vidro.
    dependencies: [
      {
        material: "Box de Banheiro",
        unit: "cj", category: "VIDROS_BOX",
        quantity: { qty: 1 },
        onlyIf: (c) => c.priceMode !== "m2",
        formulaLabel: (c) => `${c.width ?? 1} m × ${c.height ?? 1.9} m`,
      },
      {
        material: "Vidro temperado incolor 8mm",
        unit: "m²", category: "VIDROS_BOX",
        quantity: { compute: "box.glassArea" },
        onlyIf: (c) => c.priceMode === "m2",
        formulaLabel: (c) => `${c.width ?? 1} m × ${c.height ?? 1.9} m`,
      },
      { material: "Kit fixação de box",  unit: "kit",  category: "VIDROS_BOX",              quantity: { qty: 1 } },
      { material: "Silicone sanitário",  unit: "tubo", category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO", multiplier: 2 } },
    ],
  },

  // ── EXAUSTOR ──────────────────────────────────────────────────────────────
  {
    fixtureType: "EXAUSTOR",
    optional: true,
    shortLabel: "Exaustor",
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

// Preset — "Banheiro padrão econômico" (MCMV). Só o indispensável para entregar
// um banheiro funcional; conforto e acabamento superior ficam em Itens opcionais.
export const BATHROOM_STANDARD_PRESET = [
  { fixtureType: "VASO_CAIXA_ACOPLADA", quantity: 1 },
  { fixtureType: "LAVATORIO_SUSPENSO",  quantity: 1 },
  { fixtureType: "CHUVEIRO_ELETRICO",   quantity: 1, config: { voltage: "220", powerW: 5500, distance: 8 } },
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
export const BATHROOM_DOOR_DEPENDENCIES: DependencySpec[] = [
  { material: "Folha de porta interna",                 unit: "un",   category: "ESQUADRIA",              quantity: { qty: 1 } },
  { material: "Batente / marco de porta",               unit: "un",   category: "ESQUADRIA",              quantity: { qty: 1 }, canBeIncluded: true },
  { material: "Kit de alisar (guarnição)",              unit: "kit",  category: "ESQUADRIA",              quantity: { qty: 1 }, canBeIncluded: true },
  { material: "Kit 3 dobradiças",                        unit: "kit",  category: "ESQUADRIA",              quantity: { qty: 1 } },
  { material: "Fechadura banheiro (privacidade)",       unit: "un",   category: "ESQUADRIA",              quantity: { qty: 1 } },
  // Parafusos/buchas da porta saíram: item de valor irrisório para MCMV, que
  // o pedreiro traz junto com a ferragem. Não recolocar sem precificar.
  { material: "Espuma expansiva PU 500ml",              unit: "un",   category: "ESQUADRIA",              quantity: { formula: "premise:ESPUMA_POR_PORTA" } },
  {
    material: "Soleira de granito",
    unit: "m", category: "REVESTIMENTO",
    quantity: { compute: "joinery.width" },
    formulaLabel: (c: Record<string, unknown>) => `largura da porta ${c.width ?? 0} m`,
  },
];

// Materials generated by a bathroom window (keyed by joinery, subtype "banheiro").
// Window dimensions come from RoomJoinery.width/height; options (tela mosquiteira)
// from RoomJoinery.configJson.
export const BATHROOM_WINDOW_DEPENDENCIES: DependencySpec[] = [
  { material: "Janela de alumínio (banheiro)", unit: "un",  category: "ESQUADRIA", quantity: { qty: 1 } },
  {
    material: "Peitoril de granito",
    unit: "m", category: "ESQUADRIA",
    quantity: { compute: "window.width" },
    formulaLabel: (c: Record<string, unknown>) => `largura ${c.width ?? 0} m`,
  },
  // Kit de fixação da janela saiu pelo mesmo motivo do kit de parafusos da
  // porta — valor irrisório, vem junto com a esquadria.
  { material: "Selante PU 400ml",              unit: "un",  category: "ESQUADRIA", quantity: { formula: "premise:SELANTE_POR_JANELA" } },
  {
    material: "Tela mosquiteira",
    unit: "m²", category: "ESQUADRIA",
    quantity: { compute: "window.area" },
    onlyIf: (c: Record<string, unknown>) => c.telaMosquiteira === true,
    formulaLabel: (c: Record<string, unknown>) => `${c.width ?? 0} × ${c.height ?? 0}`,
  },
];

// Accessories (opt-in, individually).
//
// Dependencies live on the spec itself: an accessory offered in the UI always
// declares the materials it generates, so it can never silently produce nothing.
// Wall-hung items that carry load (gabinete, armário, barra de apoio) take the
// reinforced fixation kit; light items take the plain screw/plug kit.
const SCREWS: DependencySpec = {
  material: "Kit parafusos e buchas",
  unit: "kit", category: "ACESSORIOS_BANHEIRO",
  quantity: { qty: 1 },
};
const SCREWS_REINFORCED: DependencySpec = {
  material: "Kit fixação reforçado",
  unit: "kit", category: "ACESSORIOS_BANHEIRO",
  quantity: { qty: 1 },
};
const SILICONE: DependencySpec = {
  material: "Silicone sanitário",
  unit: "tubo", category: "ACESSORIOS_HIDRAULICOS",
  quantity: { formula: "premise:SILICONE_POR_INSTALACAO" },
};

// A simple "one unit + plain fixation" accessory.
function simpleAccessory(type: string, label: string, material: string): AccessorySpec {
  return {
    type, label,
    dependencies: [
      { material, unit: "un", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } },
      SCREWS,
    ],
  };
}

const WIDTH_ONLY: ConfigSchema = {
  width: { label: "Largura", type: "number", default: 0.6, unit: "m" },
};
const WIDTH_HEIGHT: ConfigSchema = {
  width:  { label: "Largura", type: "number", default: 0.6, unit: "m" },
  height: { label: "Altura",  type: "number", default: 0.8, unit: "m" },
};

const dims = (c: Record<string, unknown>) => `${c.width ?? 0} × ${c.height ?? 0} m`;

export const BATHROOM_ACCESSORY_SPECS: AccessorySpec[] = [
  {
    type: "ESPELHO", label: "Espelho",
    configSchema: WIDTH_HEIGHT,
    dependencies: [
      {
        material: "Espelho comum 4mm", unit: "m²", category: "ACESSORIOS_BANHEIRO",
        quantity: { compute: "accessory.area" },
        formulaLabel: dims,
      },
      { material: "Kit fixação para espelho", unit: "kit", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } },
      SILICONE,
    ],
  },
  {
    type: "GABINETE", label: "Gabinete",
    configSchema: WIDTH_ONLY,
    dependencies: [
      {
        material: "Gabinete para banheiro", unit: "un", category: "ACESSORIOS_BANHEIRO",
        quantity: { qty: 1 },
        formulaLabel: (c) => `largura ${c.width ?? 0} m`,
      },
      SCREWS_REINFORCED,
      SILICONE,
    ],
  },
  {
    type: "ARMARIO", label: "Armário",
    configSchema: WIDTH_ONLY,
    dependencies: [
      {
        material: "Armário para banheiro", unit: "un", category: "ACESSORIOS_BANHEIRO",
        quantity: { qty: 1 },
        formulaLabel: (c) => `largura ${c.width ?? 0} m`,
      },
      SCREWS_REINFORCED,
    ],
  },
  {
    type: "NICHO", label: "Nicho",
    configSchema: {
      width:  { label: "Largura", type: "number", default: 0.3, unit: "m" },
      height: { label: "Altura",  type: "number", default: 0.3, unit: "m" },
    },
    dependencies: [
      {
        material: "Nicho para banheiro", unit: "un", category: "ACESSORIOS_BANHEIRO",
        quantity: { qty: 1 },
        formulaLabel: dims,
      },
      SILICONE,
    ],
  },
  {
    type: "PRATELEIRA", label: "Prateleira",
    configSchema: WIDTH_ONLY,
    dependencies: [
      {
        material: "Prateleira de vidro", unit: "un", category: "ACESSORIOS_BANHEIRO",
        quantity: { qty: 1 },
        formulaLabel: (c) => `largura ${c.width ?? 0} m`,
      },
      SCREWS,
    ],
  },
  {
    type: "BARRA_APOIO", label: "Barra de apoio",
    configSchema: {
      width: { label: "Comprimento", type: "number", default: 0.8, unit: "m" },
    },
    dependencies: [
      {
        material: "Barra de apoio para banheiro", unit: "un", category: "ACESSORIOS_BANHEIRO",
        quantity: { qty: 1 },
        formulaLabel: (c) => `comprimento ${c.width ?? 0} m`,
      },
      SCREWS_REINFORCED,
    ],
  },
  simpleAccessory("PORTA_PAPEL",     "Porta-papel higiênico", "Porta-papel higiênico"),
  simpleAccessory("TOALHEIRO_ROSTO", "Toalheiro de rosto",    "Toalheiro de rosto"),
  simpleAccessory("TOALHEIRO_BANHO", "Toalheiro de banho",    "Toalheiro de banho"),
  simpleAccessory("GANCHO",          "Gancho",                "Gancho de parede"),
  simpleAccessory("SABONETEIRA",     "Saboneteira",           "Saboneteira"),
  simpleAccessory("PORTA_SHAMPOO",   "Porta-shampoo",         "Porta-shampoo"),
  {
    type: "LIXEIRA", label: "Lixeira",
    dependencies: [
      { material: "Lixeira de banheiro", unit: "un", category: "ACESSORIOS_BANHEIRO", quantity: { qty: 1 } },
    ],
  },
];

// UI list (chips) — derived so it can never drift from the specs above.
export const BATHROOM_ACCESSORIES = BATHROOM_ACCESSORY_SPECS.map(
  ({ type, label, configSchema }) => ({ type, label, configSchema })
);

export const BATHROOM_ACCESSORY_DEPENDENCIES: Record<string, DependencySpec[]> =
  Object.fromEntries(BATHROOM_ACCESSORY_SPECS.map((a) => [a.type, a.dependencies]));

export function getBathroomAccessorySpec(type: string): AccessorySpec | undefined {
  return BATHROOM_ACCESSORY_SPECS.find((a) => a.type === type);
}

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

// Equipamentos oferecidos no seletor do padrão econômico. Os marcados como
// `advanced` (vaso com válvula, lavatório com coluna, duchas, ralo seco e linear)
// continuam definidos e resolvem normalmente para projetos antigos, mas não
// aparecem aqui. Os `optional` saem para a seção "Itens opcionais".
const ECONOMIC_GROUPS: { label: string; types: string[] }[] = [
  { label: "Vaso sanitário", types: ["VASO_CAIXA_ACOPLADA", "VASO_VALVULA"] },
  { label: "Lavatório", types: ["LAVATORIO_SUSPENSO", "LAVATORIO_COLUNA"] },
  { label: "Chuveiro", types: ["CHUVEIRO_ELETRICO", "DUCHA_FRIA", "DUCHA_QUENTE"] },
  { label: "Ralo / caixa sifonada", types: ["CAIXA_SIFONADA", "RALO_SIFONADO", "RALO_SECO", "RALO_LINEAR"] },
];

function isEconomic(t: string): boolean {
  const spec = BATHROOM_FIXTURES.find((f) => f.fixtureType === t);
  return !!spec && !spec.advanced && !spec.optional;
}

export const BATHROOM_FIXTURE_GROUPS: { label: string; types: string[] }[] =
  ECONOMIC_GROUPS
    .map((g) => ({ label: g.label, types: g.types.filter(isEconomic) }))
    .filter((g) => g.types.length > 0);

// Equipamentos que viram caixa de seleção simples em "Itens opcionais".
export const BATHROOM_OPTIONAL_FIXTURES = BATHROOM_FIXTURES
  .filter((f) => f.optional)
  .map((f) => ({
    fixtureType: f.fixtureType,
    label: f.shortLabel ?? f.label,
    configSchema: f.configSchema,
  }));

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
