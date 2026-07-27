// Lista fixa de materiais para entrada manual de tubos e conexões
// hidrossanitárias. A UI da Etapa 5 monta os inputs a partir desta lista;
// o motor não estima nenhuma quantidade.
//
// O nome de cada item aqui casa com o nome no catálogo (seed
// `prisma/seed-tubos-conexoes.js`). Se um material sumir do catálogo, o item
// simplesmente não aparece — nada quebra.

export type PipeGroup = "agua_fria" | "esgoto";

export type PipeCatalogEntry = { name: string; unit: string };

export const PIPES_AGUA_FRIA: PipeCatalogEntry[] = [
  { name: "Tubo PVC soldável 20 mm", unit: "m" },
  { name: "Tubo PVC soldável 25 mm", unit: "m" },
  { name: "Joelho 90° soldável 20 mm", unit: "un" },
  { name: "Joelho 90° soldável 25 mm", unit: "un" },
  { name: "Tê soldável 20 mm", unit: "un" },
  { name: "Tê soldável 25 mm", unit: "un" },
  { name: "Luva soldável 20 mm", unit: "un" },
  { name: "Luva soldável 25 mm", unit: "un" },
  { name: "Adaptador soldável com rosca 20 mm x 1/2\"", unit: "un" },
  { name: "Adaptador soldável com rosca 25 mm x 3/4\"", unit: "un" },
  { name: "Joelho soldável 90° com bucha de latão 20 mm x 1/2\"", unit: "un" },
  { name: "Bucha de redução soldável 25 mm x 20 mm", unit: "un" },
  { name: "Adesivo plástico PVC", unit: "un" },
  { name: "Solução preparadora PVC", unit: "un" },
  { name: "Abraçadeira de PVC 20 mm", unit: "un" },
  { name: "Abraçadeira de PVC 25 mm", unit: "un" },
];

export const PIPES_ESGOTO: PipeCatalogEntry[] = [
  { name: "Tubo PVC esgoto 40 mm", unit: "m" },
  { name: "Tubo PVC esgoto 50 mm", unit: "m" },
  { name: "Tubo PVC esgoto 100 mm", unit: "m" },
  { name: "Joelho 45° PVC esgoto 40 mm", unit: "un" },
  { name: "Joelho 45° PVC esgoto 50 mm", unit: "un" },
  { name: "Joelho 45° PVC esgoto 100 mm", unit: "un" },
  { name: "Joelho 90° PVC esgoto 40 mm", unit: "un" },
  { name: "Joelho 90° PVC esgoto 50 mm", unit: "un" },
  { name: "Joelho 90° PVC esgoto 100 mm", unit: "un" },
  { name: "Tê sanitário PVC 40 mm", unit: "un" },
  { name: "Tê sanitário PVC 50 mm", unit: "un" },
  { name: "Tê sanitário PVC 100 mm", unit: "un" },
  { name: "Junção simples PVC 100 mm x 50 mm", unit: "un" },
  { name: "Luva PVC esgoto 40 mm", unit: "un" },
  { name: "Luva PVC esgoto 50 mm", unit: "un" },
  { name: "Luva PVC esgoto 100 mm", unit: "un" },
  { name: "Redução PVC esgoto 50 mm x 40 mm", unit: "un" },
  { name: "Redução PVC esgoto 100 mm x 50 mm", unit: "un" },
  { name: "Adaptador PVC esgoto para caixa sifonada", unit: "un" },
  { name: "Conexão para caixa sifonada", unit: "un" },
  { name: "Abraçadeira PVC esgoto 40 mm", unit: "un" },
  { name: "Abraçadeira PVC esgoto 50 mm", unit: "un" },
  { name: "Abraçadeira PVC esgoto 100 mm", unit: "un" },
];

export const PIPE_GROUPS: { key: PipeGroup; label: string; items: PipeCatalogEntry[] }[] = [
  { key: "agua_fria", label: "Água fria", items: PIPES_AGUA_FRIA },
  { key: "esgoto",    label: "Esgoto",    items: PIPES_ESGOTO },
];

export const ALL_PIPE_NAMES: string[] = [
  ...PIPES_AGUA_FRIA.map((p) => p.name),
  ...PIPES_ESGOTO.map((p) => p.name),
];
