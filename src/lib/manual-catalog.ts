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
  // Loucas, metais, acessorios e box entraram quando os equipamentos por
  // ambiente sairam do calculo automatico: sem isso nao haveria onde lanca-los.
  hidraulica: [
    "HIDRAULICA",
    "LOUCAS_SANITARIAS",
    "METAIS_SANITARIOS",
    "ACESSORIOS_HIDRAULICOS",
    "ACESSORIOS_BANHEIRO",
    "VIDROS_BOX",
  ],
  eletrica: ["ELETRICA"],
};

// Vazio de proposito. Eletrica, hidrossanitaria e os equipamentos por ambiente
// sairam do calculo automatico por decisao do usuario, entao nao ha mais nome
// nenhum que o motor emita nessas categorias — e excluir qualquer um deles aqui
// faria o item sumir da unica tela onde agora pode ser lancado.
export const ENGINE_GENERATED_NAMES: string[] = [];

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

// `extras` sao os materiais que o usuario adicionou a mao a este bloco. Entram
// num grupo proprio porque, vindo de fora das categorias do bloco, o filtro por
// categoria nao os traria de volta na proxima abertura da tela.
export function buildManualGroups(
  block: ManualBlockKey,
  materials: ManualCatalogMaterial[],
  extras: ManualCatalogMaterial[] = []
): ManualGroup[] {
  const cats = MANUAL_BLOCK_CATEGORIES[block];
  const excluded = new Set(ENGINE_GENERATED_NAMES);
  const pool = materials
    .filter((m) => cats.includes(m.category) && !excluded.has(m.name))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const jaNoPool = new Set(pool.map((m) => m.id));
  const avulsos = extras
    .filter((m) => !jaNoPool.has(m.id))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const grupoAvulsos: ManualGroup[] = avulsos.length
    ? [{ key: "avulsos", label: "Adicionados manualmente", items: avulsos }]
    : [];

  if (block === "eletrica") {
    const base: ManualGroup[] = pool.length > 0
      ? [{ key: "eletrica", label: "Cabos, eletrodutos, quadro e proteção", items: pool }]
      : [];
    return [...base, ...grupoAvulsos];
  }

  const esgoto = pool.filter((m) => isEsgoto(m.name));
  const agua = pool.filter((m) => !isEsgoto(m.name));
  const groups: ManualGroup[] = [];
  if (agua.length > 0) groups.push({ key: "agua_fria", label: "Água fria", items: agua });
  if (esgoto.length > 0) groups.push({ key: "esgoto", label: "Esgoto", items: esgoto });
  return [...groups, ...grupoAvulsos];
}
