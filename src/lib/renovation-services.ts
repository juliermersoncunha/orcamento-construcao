// Catálogo de serviços de reforma.
//
// Na reforma o usuário não descreve a casa inteira: ele vistoria, registra os
// problemas de cada ambiente e lança os serviços que os resolvem. Cada serviço
// com medida gera material sozinho, com os MESMOS coeficientes e nomes de
// material do cálculo de construção nova — assim o preço já cadastrado no
// catálogo vale aqui também. Serviço sem regra (louças, elétrica, esquadria…)
// é lançado como serviço e o material entra à mão na etapa Materiais.

import { ARGAMASSA_PAREDE_GERAL } from "./room-classification";

export type ServiceMaterial = {
  name: string;
  unit: string;
  quantity: number;
  phase: string;
  category: string;
};

export type ServiceDef = {
  key: string;
  label: string;
  grupo: string;      // agrupamento do seletor
  categoria: string;  // ofício, para a estimativa de preço
  unit: "m²" | "m" | "un" | "vb";
  // De onde vem a medida sugerida a partir do ambiente.
  medida?: "piso" | "parede" | "teto";
  materiais?: (q: number) => ServiceMaterial[];
};

// Entulho por m² de serviço, já com empolamento. Caçamba padrão de 4 m³.
const CACAMBA = "Caçamba de entulho (4 m³)";
const CACAMBA_M3 = 4;
const entulho = (m3PorM2: number) => (q: number): ServiceMaterial[] => [
  { name: CACAMBA, unit: "un", quantity: (q * m3PorM2) / CACAMBA_M3, phase: "OUTROS", category: "OUTROS" },
];

// Perdas e consumos: os mesmos de calcRevestimentos e calcPintura.
const LOSS_PISO = 1.10;
const LOSS_ARG = 1.06;

export const RENOVATION_SERVICES: ServiceDef[] = [
  // ── Demolição e remoção ──
  { key: "remover_piso", categoria: "Demolição", label: "Remover piso", grupo: "Demolição e remoção", unit: "m²", medida: "piso", materiais: entulho(0.05) },
  { key: "remover_revestimento_parede", categoria: "Demolição", label: "Remover cerâmica / revestimento de parede", grupo: "Demolição e remoção", unit: "m²", medida: "parede", materiais: entulho(0.04) },
  { key: "remover_reboco", categoria: "Demolição", label: "Remover reboco", grupo: "Demolição e remoção", unit: "m²", medida: "parede", materiais: entulho(0.04) },
  { key: "demolir_alvenaria", categoria: "Demolição", label: "Demolir alvenaria", grupo: "Demolição e remoção", unit: "m²", materiais: entulho(0.18) },

  // ── Base ──
  {
    key: "contrapiso", categoria: "Alvenaria", label: "Contrapiso (5 cm)", grupo: "Base", unit: "m²", medida: "piso",
    // Argamassa 1:3, 0,05 m³/m²: ~8 sacos de cimento por m³ e areia com 10% de perda.
    materiais: (q) => [
      { name: "Cimento CP-II (50kg)", unit: "sc", quantity: q * 0.05 * 8, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
      { name: "Areia Média", unit: "m³", quantity: q * 0.05 * 1.10, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
    ],
  },
  {
    key: "reboco", categoria: "Alvenaria", label: "Chapisco e reboco", grupo: "Base", unit: "m²", medida: "parede",
    // Coeficientes de calcAlvenaria (chapisco + reboco interno).
    materiais: (q) => [
      { name: "Cimento CP-II (50kg)", unit: "sc", quantity: q * (0.04 * 1.05 + 0.08 * 1.10), phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
      { name: "Areia Grossa", unit: "m³", quantity: q * 0.006 * 1.05, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
      { name: "Areia Fina", unit: "m³", quantity: q * 0.018 * 1.10, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
    ],
  },
  {
    key: "impermeabilizacao", categoria: "Impermeabilização", label: "Impermeabilização", grupo: "Base", unit: "m²", medida: "piso",
    // Argamassa polimérica, ~4 kg/m² em duas demãos.
    materiais: (q) => [
      { name: "Argamassa polimérica (impermeabilização)", unit: "kg", quantity: q * 4 * 1.05, phase: "REVESTIMENTOS", category: "IMPERMEABILIZACAO" },
    ],
  },

  // ── Revestimentos ──
  {
    key: "piso_ceramico", categoria: "Revestimentos", label: "Assentar piso cerâmico", grupo: "Revestimentos", unit: "m²", medida: "piso",
    materiais: (q) => [
      { name: "Piso Cerâmico", unit: "m²", quantity: q * LOSS_PISO, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
      { name: "Argamassa AC-II (assentamento piso)", unit: "sc", quantity: q * 0.286 * LOSS_ARG, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
      { name: "Rejunte", unit: "kg", quantity: q * 0.4 * LOSS_ARG, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
    ],
  },
  {
    key: "piso_porcelanato", categoria: "Revestimentos", label: "Assentar porcelanato", grupo: "Revestimentos", unit: "m²", medida: "piso",
    materiais: (q) => [
      { name: "Piso Porcelanato", unit: "m²", quantity: q * LOSS_PISO, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
      { name: "Argamassa AC-III", unit: "sc", quantity: q * 0.4 * LOSS_ARG, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
      { name: "Rejunte", unit: "kg", quantity: q * 0.4 * LOSS_ARG, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
    ],
  },
  {
    key: "revestimento_parede", categoria: "Revestimentos", label: "Assentar cerâmica de parede (azulejo)", grupo: "Revestimentos", unit: "m²", medida: "parede",
    materiais: (q) => [
      { name: "Revestimento Cerâmico (parede)", unit: "m²", quantity: q * LOSS_PISO, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
      { name: ARGAMASSA_PAREDE_GERAL, unit: "sc", quantity: q * 0.45, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
      { name: "Rejunte", unit: "kg", quantity: q * 0.4 * LOSS_ARG, phase: "REVESTIMENTOS", category: "REVESTIMENTO" },
    ],
  },
  { key: "rejuntar", categoria: "Revestimentos", label: "Refazer rejunte", grupo: "Revestimentos", unit: "m²", medida: "piso",
    materiais: (q) => [{ name: "Rejunte", unit: "kg", quantity: q * 0.4 * LOSS_ARG, phase: "REVESTIMENTOS", category: "REVESTIMENTO" }] },

  // ── Pintura ──
  {
    key: "pintura_simples", categoria: "Pintura", label: "Pintura (só tinta)", grupo: "Pintura", unit: "m²", medida: "parede",
    materiais: (q) => [
      { name: "Selador acrílico", unit: "L", quantity: q * 0.10, phase: "PINTURA", category: "PINTURA" },
      { name: "Tinta Acrílica Fosca", unit: "L", quantity: q * 0.18, phase: "PINTURA", category: "PINTURA" },
    ],
  },
  {
    key: "pintura_massa", categoria: "Pintura", label: "Pintura com massa corrida", grupo: "Pintura", unit: "m²", medida: "parede",
    materiais: (q) => [
      { name: "Massa corrida", unit: "kg", quantity: q * 1.48, phase: "PINTURA", category: "PINTURA" },
      { name: "Lixa para massa", unit: "un", quantity: q * 0.2, phase: "PINTURA", category: "PINTURA" },
      { name: "Selador acrílico", unit: "L", quantity: q * 0.10, phase: "PINTURA", category: "PINTURA" },
      { name: "Tinta Acrílica Fosca", unit: "L", quantity: q * 0.18, phase: "PINTURA", category: "PINTURA" },
    ],
  },
  {
    key: "pintura_teto", categoria: "Pintura", label: "Pintura de teto", grupo: "Pintura", unit: "m²", medida: "teto",
    materiais: (q) => [
      { name: "Selador acrílico", unit: "L", quantity: q * 0.10, phase: "PINTURA", category: "PINTURA" },
      { name: "Tinta Acrílica Fosca", unit: "L", quantity: q * 0.18, phase: "PINTURA", category: "PINTURA" },
    ],
  },
  {
    key: "gesso_liso", categoria: "Gesso", label: "Gesso liso", grupo: "Pintura", unit: "m²", medida: "parede",
    materiais: (q) => [
      { name: "Gesso liso", unit: "kg", quantity: q * 1.26, phase: "PINTURA", category: "PINTURA" },
      { name: "Lixa para massa", unit: "un", quantity: q * 0.2, phase: "PINTURA", category: "PINTURA" },
    ],
  },

  // ── Sem regra de material: lançado à mão na etapa Materiais ──
  { key: "loucas_metais", categoria: "Louças e metais", label: "Trocar louças e metais", grupo: "Instalações e acabamentos", unit: "un" },
  { key: "eletrica", categoria: "Elétrica", label: "Revisão / troca de elétrica", grupo: "Instalações e acabamentos", unit: "vb" },
  { key: "hidraulica", categoria: "Hidráulica", label: "Revisão / troca de hidráulica", grupo: "Instalações e acabamentos", unit: "vb" },
  { key: "esquadrias", categoria: "Esquadrias", label: "Trocar porta ou janela", grupo: "Instalações e acabamentos", unit: "un" },
  { key: "forro", categoria: "Forro", label: "Forro", grupo: "Instalações e acabamentos", unit: "m²", medida: "teto" },
  { key: "outro", categoria: "Outros", label: "Outro serviço", grupo: "Instalações e acabamentos", unit: "vb" },
];

export const SERVICE_BY_KEY = new Map(RENOVATION_SERVICES.map((s) => [s.key, s]));

export const SERVICE_GROUPS = [...new Set(RENOVATION_SERVICES.map((s) => s.grupo))];

// Ordem em que os ofícios aparecem na estimativa — segue a sequência da obra.
export const SERVICE_CATEGORIES = [
  "Demolição", "Alvenaria", "Impermeabilização", "Revestimentos", "Gesso",
  "Pintura", "Elétrica", "Hidráulica", "Esquadrias", "Forro",
  "Louças e metais", "Outros",
];

// Itens de gestão da obra. BDI é percentual sobre o custo direto; os demais
// são valores fechados.
export const MANAGEMENT_ITEMS = [
  { key: "mobilizacao", label: "Mobilização e canteiro", percentual: false },
  { key: "logistica", label: "Logística", percentual: false },
  { key: "gestao", label: "Gestão da obra", percentual: false },
  { key: "bdi", label: "BDI", percentual: true },
];

// Categorias de problema da vistoria.
export const ISSUE_CATEGORIES = [
  "Trinca / fissura",
  "Infiltração / umidade",
  "Mofo / bolor",
  "Piso danificado / solto",
  "Revestimento danificado",
  "Pintura descascando",
  "Instalação elétrica",
  "Instalação hidráulica / vazamento",
  "Esquadria / porta / janela",
  "Cobertura / telhado",
  "Alvenaria",
  "Estrutural",
  "Outro",
] as const;

export const SEVERITIES = [
  { value: "BAIXA", label: "Baixa", cor: "bg-gray-100 text-gray-700" },
  { value: "MEDIA", label: "Média", cor: "bg-amber-100 text-amber-800" },
  { value: "ALTA", label: "Alta", cor: "bg-orange-100 text-orange-800" },
  { value: "URGENTE", label: "Urgente", cor: "bg-red-100 text-red-700" },
] as const;

/** Medida sugerida a partir das dimensões do ambiente. */
export function medidaSugerida(
  medida: ServiceDef["medida"],
  room: { width: number; length: number; height: number }
): number | null {
  if (!medida) return null;
  const piso = room.width * room.length;
  if (medida === "piso" || medida === "teto") return Math.round(piso * 100) / 100;
  return Math.round(2 * (room.width + room.length) * room.height * 100) / 100;
}

/**
 * Materiais de um conjunto de serviços, somados por nome. O arredondamento é
 * feito só no total — arredondar serviço a serviço contaria uma caçamba
 * inteira para cada parede removida.
 */
export function materiaisDosServicos(
  servicos: { serviceKey: string; quantity: number }[]
): ServiceMaterial[] {
  const acc = new Map<string, ServiceMaterial>();
  for (const s of servicos) {
    const def = SERVICE_BY_KEY.get(s.serviceKey);
    if (!def?.materiais || !(s.quantity > 0)) continue;
    for (const m of def.materiais(s.quantity)) {
      const a = acc.get(m.name) ?? { ...m, quantity: 0 };
      a.quantity += m.quantity;
      acc.set(m.name, a);
    }
  }
  return [...acc.values()].map((m) => ({
    ...m,
    quantity: m.unit === "m³" ? Math.ceil(m.quantity * 10) / 10 : Math.ceil(m.quantity),
  }));
}
