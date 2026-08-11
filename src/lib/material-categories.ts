// Fonte única das categorias de material: rótulo e ordem de exibição.
//
// Antes esta lista existia em três lugares (o <select> do formulário, o schema
// Zod da server action e os rótulos da página do catálogo) e saiu de sincronia
// — seis categorias existiam no banco mas não apareciam no formulário. Quem
// adicionar uma categoria nova ao enum MaterialCategory do Prisma precisa
// adicioná-la aqui também; o teste de tipo em material-categories.check.ts
// quebra o build se esquecer.
//
// Sem import de @prisma/client: este módulo é usado por componentes client.

export const MATERIAL_CATEGORIES = [
  { value: "TERRAPLENAGEM",          label: "Terraplenagem" },
  { value: "FUNDACAO",               label: "Fundação" },
  { value: "ESTRUTURA",              label: "Estrutura" },
  { value: "ALVENARIA",              label: "Alvenaria" },
  { value: "LAJE",                   label: "Laje" },
  { value: "COBERTURA",              label: "Cobertura" },
  { value: "ELETRICA",               label: "Elétrica" },
  { value: "HIDRAULICA",             label: "Hidráulica/Hidrossanitária" },
  { value: "REVESTIMENTO",           label: "Revestimento" },
  { value: "PINTURA",                label: "Pintura" },
  { value: "ESQUADRIA",              label: "Esquadria/Acabamento" },
  { value: "ACABAMENTO",             label: "Acabamento" },
  { value: "LOUCAS_SANITARIAS",      label: "Louças sanitárias" },
  { value: "METAIS_SANITARIOS",      label: "Metais sanitários" },
  { value: "ACESSORIOS_HIDRAULICOS", label: "Acessórios hidráulicos" },
  { value: "IMPERMEABILIZACAO",      label: "Impermeabilização" },
  { value: "VIDROS_BOX",             label: "Vidros e box" },
  { value: "ACESSORIOS_BANHEIRO",    label: "Acessórios de banheiro" },
  { value: "OUTROS",                 label: "Outros" },
] as const;

export type MaterialCategoryValue = (typeof MATERIAL_CATEGORIES)[number]["value"];

// Tupla de valores — o formato que z.enum() espera.
export const MATERIAL_CATEGORY_VALUES = MATERIAL_CATEGORIES.map((c) => c.value) as unknown as [
  MaterialCategoryValue,
  ...MaterialCategoryValue[],
];

// Ordem em que as categorias aparecem no catálogo (a mesma da lista acima).
export const MATERIAL_CATEGORY_ORDER: MaterialCategoryValue[] = MATERIAL_CATEGORIES.map(
  (c) => c.value
);

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategoryValue, string> =
  Object.fromEntries(MATERIAL_CATEGORIES.map((c) => [c.value, c.label])) as Record<
    MaterialCategoryValue,
    string
  >;
