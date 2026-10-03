// Modelo sugerido de etapas de obra (casa terrea, alvenaria + concreto armado).
//
// Isto e um PONTO DE PARTIDA, nao um padrao fixo: o projeto nasce sem etapa
// nenhuma e o usuario aplica este modelo se quiser, podendo depois renomear,
// reordenar, excluir ou criar as suas.
//
// `dependsOn` e texto livre de propósito — na obra a dependencia raramente e
// uma so e o usuario precisa anotar a condicao ("5, ou 1 se deixar vao").

export type ScheduleTemplateStage = {
  name: string;
  deliverable: string;
  dependsOn: string;
  days: number;
};

export const SCHEDULE_TEMPLATE: ScheduleTemplateStage[] = [
  { name: "Pré-obra",                      deliverable: "Alvará, ART/RRT, água e luz provisórias",             dependsOn: "—",      days: 0 },
  { name: "Mobilização e canteiro",        deliverable: "Terreno limpo, barracão trancado, tapume, sanitário", dependsOn: "Pré-obra", days: 3 },
  { name: "Locação e gabarito",            deliverable: "Casa demarcada no terreno, eixos e níveis",           dependsOn: "Mobilização", days: 1 },
  { name: "Terraplenagem e preparo do solo", deliverable: "Solo regularizado e compactado na cota",            dependsOn: "Locação", days: 2 },
  { name: "Infra enterrada",               deliverable: "Esgoto e água sob a laje, instalados e testados",     dependsOn: "Terraplenagem", days: 3 },
  { name: "Radier",                        deliverable: "Laje de fundação concretada e curada",                dependsOn: "Infra enterrada", days: 4 },
  { name: "Muro frontal",                  deliverable: "Frente fechada",                                      dependsOn: "Radier (ou Mobilização, se deixar vão de obra)", days: 4 },
  { name: "Alvenaria e estrutura",         deliverable: "Paredes, pilares, vigas, vergas e platibanda",        dependsOn: "Radier", days: 20 },
  { name: "Laje de forro",                 deliverable: "Teto concretado e curado",                            dependsOn: "Alvenaria", days: 5 },
  { name: "Cobertura",                     deliverable: "Casa coberta e estanque — inclui rufo e calha",       dependsOn: "Laje", days: 5 },
  { name: "Instalações embutidas",         deliverable: "Eletrodutos, caixas e tubos dentro das paredes",      dependsOn: "Cobertura", days: 6 },
  { name: "Esquadrias",                    deliverable: "Batentes e contramarcos chumbados",                   dependsOn: "Instalações embutidas", days: 3 },
  { name: "Revestimentos",                 deliverable: "Chapisco, reboco, contrapiso, piso e azulejo",        dependsOn: "Esquadrias", days: 22 },
  { name: "Gesso liso e pintura",          deliverable: "Paredes acabadas",                                    dependsOn: "Revestimentos", days: 12 },
  { name: "Louças, metais e bancadas",     deliverable: "Banheiros e cozinha montados",                        dependsOn: "Gesso e pintura", days: 5 },
  { name: "Elétrica e hidráulica finais",  deliverable: "Fiação, quadro, tomadas, luminárias, registros",      dependsOn: "Gesso e pintura", days: 5 },
  { name: "Limpeza e entrega",             deliverable: "Obra limpa, testes feitos, vistoria",                 dependsOn: "Louças e Elétrica", days: 2 },
];

export const STAGE_STATUS = [
  { value: "PENDENTE",     label: "Pendente" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "CONCLUIDA",    label: "Concluída" },
] as const;
