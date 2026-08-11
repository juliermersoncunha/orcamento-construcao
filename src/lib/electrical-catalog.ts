// Lista fixa de materiais para entrada manual da infraestrutura elétrica —
// cabos, eletrodutos, caixas, proteção e aterramento. O motor não estima
// metragem de cabo nem quantidade de eletroduto/disjuntor.
//
// A divisão é: o que o usuário declara por ambiente (tomada, interruptor,
// ponto de luz) vira acabamento automático; a infraestrutura de passagem e
// proteção é medida no projeto elétrico e informada aqui.
//
// O nome de cada item casa com o nome no catálogo de materiais. Se um
// material sumir do catálogo, o item some da UI — nada quebra.

export type ManualCatalogEntry = { name: string; unit: string };

export const CABOS: ManualCatalogEntry[] = [
  { name: "Cabo flexível 1,5mm²", unit: "m" },
  { name: "Cabo flexível 2,5mm²", unit: "m" },
  { name: "Cabo flexível 4mm²", unit: "m" },
  { name: "Cabo flexível 6mm²", unit: "m" },
  { name: "Cabo flexível 10mm²", unit: "m" },
  { name: "Cabo flexível 4mm² (terra)", unit: "m" },
  { name: "Cabo flexível 6mm² (terra)", unit: "m" },
  { name: "Cabo flexível 10mm² (terra)", unit: "m" },
  { name: "Cabo flexível PP 2x2,5mm²", unit: "m" },
];

export const ELETRODUTOS_CAIXAS: ManualCatalogEntry[] = [
  { name: "Conduíte Corrugado 3/4\" (flexível)", unit: "m" },
  { name: "Eletroduto rígido 3/4\"", unit: "m" },
  { name: "Caixa de Passagem 4x4", unit: "un" },
  { name: "Caixa de energia 4x2", unit: "un" },
  { name: "Caixa de Passagem 4x4/4x2", unit: "un" },
];

export const PROTECAO_ATERRAMENTO: ManualCatalogEntry[] = [
  { name: "Quadro de Distribuição", unit: "un" },
  { name: "Disjuntor monopolar 16A", unit: "un" },
  { name: "Disjuntor monopolar 25A", unit: "un" },
  { name: "Disjuntor monopolar 40A", unit: "un" },
  { name: "Disjuntor monopolar 63A", unit: "un" },
  { name: "Interruptor DR 2P 30mA", unit: "un" },
  { name: "Haste de aterramento 5/8\" x 1,50m", unit: "un" },
  { name: "Conector de aterramento", unit: "un" },
  { name: "Fita isolante 19mm x 20m", unit: "un" },
];

export const ELECTRICAL_GROUPS: { key: string; label: string; items: ManualCatalogEntry[] }[] = [
  { key: "cabos",      label: "Cabos e fios",              items: CABOS },
  { key: "eletroduto", label: "Eletrodutos e caixas",      items: ELETRODUTOS_CAIXAS },
  { key: "protecao",   label: "Proteção e aterramento",    items: PROTECAO_ATERRAMENTO },
];

export const ALL_ELECTRICAL_NAMES: string[] = ELECTRICAL_GROUPS.flatMap((g) =>
  g.items.map((i) => i.name)
);
