// Blocos de entrada manual da Etapa 5 (tubos/conexões e cabos/infraestrutura).
//
// A tela espelha o catálogo: em vez de uma lista fixa de nomes — que saía do ar
// assim que um material era renomeado ou cadastrado — ela mostra tudo o que
// estiver ativo nas categorias abaixo. Cadastrou em Admin › Materiais, aparece
// aqui sozinho.
//
// A exceção são os materiais que o próprio cálculo já gera: informá-los aqui
// somaria em cima do que o motor emite. Ficam de fora por nome.

export type ManualBlockKey = "hidraulica" | "eletrica";

export const MANUAL_BLOCK_CATEGORIES: Record<ManualBlockKey, string[]> = {
  hidraulica: ["HIDRAULICA"],
  eletrica: ["ELETRICA"],
};

// Emitidos pelo motor a partir de outras respostas do wizard. Cabos, eletrodutos
// e disjuntores gerais NÃO entram aqui de propósito: o chuveiro gera o cabo do
// circuito exclusivo dele, e somar com o cabo da instalação geral é o correto.
export const ENGINE_GENERATED_NAMES: string[] = [
  // calcHidrossanitaria — vêm das respostas da Etapa 5
  "Caixa d'Água 1000L",
  "Fossa Séptica",
  // Acabamentos elétricos — vêm dos pontos declarados por ambiente
  "Tomada 2P+T 10A",
  "Conjunto 2 tomadas 2P+T 10A",
  "Conjunto 3 tomadas 2P+T 10A",
  "Interruptor simples 10A",
  "Interruptor duplo 10A",
  "Interruptor triplo 10A",
  "Plafon LED 18W (integrado)",
  "Plafon plástico E-27",
  "Lâmpada LED bulbo 9W",
  // Equipamentos de banheiro — vêm do card de equipamentos
  "Chuveiro elétrico",
  "Exaustor de banheiro",
  "Grelha externa para exaustor",
  "Disjuntor monopolar exclusivo",
  "Box de Banheiro",
];

export type ManualCatalogMaterial = {
  id: string;
  name: string;
  unit: string;
  currentPrice: number;
  category: string;
};

export type ManualGroup = {
  key: string;
  label: string;
  items: ManualCatalogMaterial[];
};

// Água fria x esgoto é só para facilitar a leitura da tabela — o catálogo não
// guarda essa distinção, então ela sai do nome. Errar a coluna não muda conta
// nenhuma, o material e a quantidade continuam os mesmos.
function isEsgoto(name: string): boolean {
  return /esgoto|sifonad|gordura|ralo|sanit[áa]rio/i.test(name);
}

export function buildManualGroups(
  block: ManualBlockKey,
  materials: ManualCatalogMaterial[]
): ManualGroup[] {
  const cats = MANUAL_BLOCK_CATEGORIES[block];
  const excluded = new Set(ENGINE_GENERATED_NAMES);
  const pool = materials
    .filter((m) => cats.includes(m.category) && !excluded.has(m.name))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  if (block === "eletrica") {
    return pool.length > 0
      ? [{ key: "eletrica", label: "Cabos, eletrodutos, quadro e proteção", items: pool }]
      : [];
  }

  const esgoto = pool.filter((m) => isEsgoto(m.name));
  const agua = pool.filter((m) => !isEsgoto(m.name));
  const groups: ManualGroup[] = [];
  if (agua.length > 0) groups.push({ key: "agua_fria", label: "Água fria", items: agua });
  if (esgoto.length > 0) groups.push({ key: "esgoto", label: "Esgoto", items: esgoto });
  return groups;
}
