// Kitchen fixture library — cozinha padrão econômica (MCMV).
// Mesma arquitetura do banheiro: cada equipamento declara pontos, dependências
// e configuração. O motor `resolveRoomFixtures` é agnóstico e resolve pelos
// mesmos `FixtureSpec` / `DependencySpec`.
//
// Escopo: casa popular de até ~R$ 160 mil. Não inclui água quente, eletro-
// domésticos, monocomando, cooktop, coifa, ilha, bancada em L/U.

import type { FixtureSpec, DependencySpec, AccessorySpec } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Equipamentos principais
// ─────────────────────────────────────────────────────────────────────────────
export const KITCHEN_FIXTURES: FixtureSpec[] = [
  // ── PIA DE GRANITO SIMPLES ────────────────────────────────────────────────
  // Bloco de granito 1,20 × 0,55 com cuba de inox integrada ou colada. Escopo
  // do padrão econômico: única opção "conjunto com cuba". Se o usuário quiser
  // uma cuba diferente, marca "cuba já incluída" e cadastra separado.
  {
    fixtureType: "PIA_GRANITO",
    label: "Pia de granito simples (com cuba)",
    hydraulicPoints: [
      { type: "AGUA_FRIA", qty: 1 },
      { type: "ESGOTO_50", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Pia de granito 1,20m (com cuba)",  unit: "un",  category: "LOUCAS_SANITARIAS",     quantity: { qty: 1 } },
      { material: "Cuba de inox 40x34cm",              unit: "un",  category: "LOUCAS_SANITARIAS",     quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Válvula de escoamento cozinha 4,5\"", unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Sifão sanfonado universal",        unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Suporte / mão-francesa",           unit: "par", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Silicone incolor",                 unit: "tubo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
      { material: "Fita veda-rosca",                  unit: "rolo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 2 } },
    ],
  },

  // ── PIA DE INOX (cuba integrada) ──────────────────────────────────────────
  {
    fixtureType: "PIA_INOX",
    label: "Pia de aço inox (cuba integrada)",
    hydraulicPoints: [
      { type: "AGUA_FRIA", qty: 1 },
      { type: "ESGOTO_50", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      { material: "Pia de aço inox 1,20m",             unit: "un",  category: "LOUCAS_SANITARIAS",     quantity: { qty: 1 } },
      { material: "Válvula de escoamento cozinha 4,5\"", unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Sifão sanfonado universal",         unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Suporte / mão-francesa",            unit: "par", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Silicone incolor",                  unit: "tubo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
      { material: "Fita veda-rosca",                   unit: "rolo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 2 } },
    ],
  },

  // ── BANCADA COM CUBA ──────────────────────────────────────────────────────
  // Comprimento e profundidade vêm do config; a bancada é vendida por m².
  // Frontão simples 10 cm de altura corre em todo o comprimento quando marcado.
  {
    fixtureType: "BANCADA_COZINHA",
    label: "Bancada simples com cuba",
    configSchema: {
      comprimento: { label: "Comprimento (m)",     type: "number", default: 1.5, unit: "m" },
      profundidade:{ label: "Profundidade (m)",    type: "number", default: 0.55, unit: "m" },
      material:    { label: "Material",             type: "enum",   default: "granito", options: ["granito", "marmore", "quartzo"] },
      comFrontao:  { label: "Com frontão simples",  type: "boolean", default: true },
      comSuporte:  { label: "Precisa de suporte",   type: "boolean", default: true },
    },
    hydraulicPoints: [
      { type: "AGUA_FRIA", qty: 1 },
      { type: "ESGOTO_50", qty: 1 },
    ],
    electricalPoints: [],
    dependencies: [
      // Bancada em m² — comprimento × profundidade
      {
        material: (c) => `Bancada de ${c.material ?? "granito"}`,
        unit: "m²",
        category: "REVESTIMENTO",
        quantity: { compute: "bancada.area" },
        formulaLabel: (c) => `${(c.comprimento as number ?? 0)} m × ${(c.profundidade as number ?? 0)} m`,
      },
      // Frontão 10cm × comprimento
      {
        material: (c) => `Frontão de ${c.material ?? "granito"} 10cm`,
        unit: "m",
        category: "REVESTIMENTO",
        quantity: { compute: "bancada.frontao" },
        onlyIf: (c) => c.comFrontao === true,
        formulaLabel: (c) => `${(c.comprimento as number ?? 0)} m × 1 (frontão)`,
      },
      { material: "Cuba de inox 40x34cm",              unit: "un",  category: "LOUCAS_SANITARIAS",     quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Recorte para cuba",                 unit: "un",  category: "REVESTIMENTO",         quantity: { qty: 1 } },
      { material: "Válvula de escoamento cozinha 4,5\"", unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Sifão sanfonado universal",         unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Suporte / mão-francesa",            unit: "par", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 }, canBeIncluded: true, onlyIf: (c) => c.comSuporte === true },
      { material: "Adesivo para bancada",              unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Silicone incolor",                  unit: "tubo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:SILICONE_POR_INSTALACAO" } },
      { material: "Fita veda-rosca",                   unit: "rolo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 2 } },
    ],
  },

  // ── TORNEIRA DE PAREDE ────────────────────────────────────────────────────
  // Sai da parede, não passa por bancada — só torneira + veda-rosca.
  // A conexão de parede (joelho com bucha de latão) fica na lista manual
  // de tubos e conexões, porque depende do traçado da instalação.
  {
    fixtureType: "TORNEIRA_COZINHA_PAREDE",
    label: "Torneira simples de parede",
    hydraulicPoints: [],
    electricalPoints: [],
    dependencies: [
      { material: "Torneira de parede para cozinha", unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 } },
      { material: "Fita veda-rosca",                 unit: "rolo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO" } },
    ],
  },

  // ── TORNEIRA DE BANCADA ───────────────────────────────────────────────────
  // Furo na pia/bancada. Vem com engate + registro angular + kit fixação.
  {
    fixtureType: "TORNEIRA_COZINHA_BANCADA",
    label: "Torneira simples de bancada",
    hydraulicPoints: [],
    electricalPoints: [],
    dependencies: [
      { material: "Torneira de bancada para cozinha",   unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 } },
      { material: "Engate flexível PVC 30cm",           unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Registro angular 1/2\" x 1/2\"",     unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 } },
      { material: "Kit fixação torneira",               unit: "kit", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 }, canBeIncluded: true },
      { material: "Fita veda-rosca",                    unit: "rolo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO", multiplier: 2 } },
    ],
  },

  // ── KIT BOTIJÃO DE GÁS ────────────────────────────────────────────────────
  // Escopo econômico: fogão a gás com botijão P13 dentro do imóvel. Sem rede,
  // sem central. Item opcional que só entra quando o usuário selecionar.
  {
    fixtureType: "KIT_BOTIJAO_GAS",
    label: "Kit básico para botijão de gás",
    optional: true,
    shortLabel: "Kit botijão",
    hydraulicPoints: [],
    electricalPoints: [],
    dependencies: [
      { material: "Regulador de gás P13",               unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Mangueira flexível para gás 1,25m",  unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Abraçadeira para mangueira de gás",  unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 2 } },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Preset "Cozinha padrão econômica"
// ─────────────────────────────────────────────────────────────────────────────
// Um clique carrega a composição típica. O usuário ainda pode editar cada item.
export const KITCHEN_STANDARD_PRESET = [
  { fixtureType: "PIA_GRANITO",              config: {}, includedComponents: [] },
  { fixtureType: "TORNEIRA_COZINHA_PAREDE",  config: {}, includedComponents: [] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Acessórios opcionais (item avulso, sem pontos, com composição simples)
// ─────────────────────────────────────────────────────────────────────────────
export const KITCHEN_ACCESSORY_SPECS: AccessorySpec[] = [
  {
    type: "FILTRO_AGUA",
    label: "Filtro / purificador de água",
    dependencies: [
      { material: "Filtro de água simples",        unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Kit instalação filtro",         unit: "kit", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
    ],
  },
  {
    type: "PONTO_LAVA_LOUCAS",
    label: "Ponto para lava-louças",
    dependencies: [
      { material: "Registro angular 1/2\" x 1/2\"",unit: "un",  category: "METAIS_SANITARIOS",     quantity: { qty: 1 } },
      { material: "Engate flexível PVC 30cm",      unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Fita veda-rosca",               unit: "rolo",category: "ACESSORIOS_HIDRAULICOS", quantity: { formula: "premise:VEDA_ROSCA_POR_CONEXAO" } },
    ],
  },
  {
    type: "DEPURADOR_COIFA",
    label: "Depurador ou coifa (infraestrutura)",
    dependencies: [
      { material: "Kit fixação depurador/coifa",   unit: "kit", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
      { material: "Grelha externa 100mm",          unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
    ],
  },
  {
    type: "RALO_PISO_COZINHA",
    label: "Ralo de piso",
    dependencies: [
      { material: "Ralo seco 100x100mm",           unit: "un",  category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
    ],
  },
  {
    type: "ARMARIO_SIMPLES",
    label: "Armário aéreo simples 1,20m",
    dependencies: [
      { material: "Armário aéreo simples 1,20m",   unit: "un",  category: "LOUCAS_SANITARIAS",     quantity: { qty: 1 } },
      { material: "Kit fixação para armário",      unit: "kit", category: "ACESSORIOS_HIDRAULICOS", quantity: { qty: 1 } },
    ],
  },
];

export const KITCHEN_ACCESSORIES = KITCHEN_ACCESSORY_SPECS.map((a) => ({
  type: a.type,
  label: a.label,
}));

export const KITCHEN_ACCESSORY_DEPENDENCIES: Record<string, DependencySpec[]> =
  Object.fromEntries(KITCHEN_ACCESSORY_SPECS.map((a) => [a.type, a.dependencies]));

export function getKitchenAccessorySpec(type: string): AccessorySpec | undefined {
  return KITCHEN_ACCESSORY_SPECS.find((a) => a.type === type);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
export function getKitchenFixtureSpec(fixtureType: string): FixtureSpec | undefined {
  return KITCHEN_FIXTURES.find((f) => f.fixtureType === fixtureType);
}

// Grupos usados no seletor "adicionar item"
export const KITCHEN_FIXTURE_GROUPS: { label: string; types: string[] }[] = [
  { label: "Pia",      types: ["PIA_GRANITO", "PIA_INOX", "BANCADA_COZINHA"] },
  { label: "Torneira", types: ["TORNEIRA_COZINHA_PAREDE", "TORNEIRA_COZINHA_BANCADA"] },
];

export const KITCHEN_OPTIONAL_FIXTURES = KITCHEN_FIXTURES
  .filter((f) => f.optional === true)
  .map((f) => ({ fixtureType: f.fixtureType, label: f.shortLabel ?? f.label }));

// Ambientes que o card da cozinha atende. Detectado por `Room.roomType`
// (não pelo nome, porque o usuário renomeia).
export const KITCHEN_ROOM_TYPES: { value: string; label: string }[] = [
  { value: "COZINHA", label: "Cozinha" },
];

export const KITCHEN_ROOM_TYPE_SET = new Set(KITCHEN_ROOM_TYPES.map((t) => t.value));
