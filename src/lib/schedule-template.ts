// Modelo sugerido de etapas de obra (casa terrea, alvenaria + concreto armado).
//
// Isto e um PONTO DE PARTIDA, nao um padrao fixo: o projeto nasce sem etapa
// nenhuma e o usuario aplica este modelo se quiser, podendo depois renomear,
// reordenar, excluir ou criar as suas.
//
// `dependsOn` e texto livre de propósito — na obra a dependencia raramente e
// uma so e o usuario precisa anotar a condicao ("Radier, ou Mobilizacao se
// deixar vao").
//
// `tasks` e o passo a passo dentro da etapa: vira checklist de execucao, cada
// item marcado conforme sai na obra.

export type ScheduleTemplateStage = {
  name: string;
  deliverable: string;
  dependsOn: string;
  days: number;
  tasks: string[];
};

export const SCHEDULE_TEMPLATE: ScheduleTemplateStage[] = [
  {
    name: "Pré-obra",
    deliverable: "Alvará, ART/RRT, água e luz provisórias",
    dependsOn: "—",
    days: 0,
    tasks: [
      "Projeto aprovado na prefeitura",
      "Alvará de construção",
      "ART/RRT do responsável técnico",
      "Ligação provisória de água",
      "Ligação provisória de energia",
    ],
  },
  {
    name: "Mobilização e canteiro",
    deliverable: "Terreno limpo, barracão trancado, tapume, sanitário",
    dependsOn: "Pré-obra",
    days: 3,
    tasks: [
      "Limpeza e roçada do terreno",
      "Barracão / depósito trancado",
      "Tapume ou cerca provisória",
      "Sanitário de obra",
      "Ponto de água e energia no canteiro",
      "Placa da obra",
    ],
  },
  {
    name: "Locação e gabarito",
    deliverable: "Casa demarcada no terreno, eixos e níveis",
    dependsOn: "Mobilização",
    days: 1,
    tasks: [
      "Conferir as medidas reais do lote",
      "Montar o gabarito de madeira",
      "Marcar os eixos das paredes",
      "Conferir esquadro pelas diagonais",
      "Definir o nível de referência (RN)",
    ],
  },
  {
    name: "Terraplenagem e preparo do solo",
    deliverable: "Solo regularizado e compactado na cota",
    dependsOn: "Locação",
    days: 2,
    tasks: [
      "Escavação",
      "Remoção do material escavado",
      "Regularização na cota do projeto",
      "Compactação do solo",
      "Conferir o nível final",
    ],
  },
  {
    name: "Infra enterrada",
    deliverable: "Esgoto e água sob a laje, instalados e testados",
    dependsOn: "Terraplenagem",
    days: 3,
    tasks: [
      "Marcar os pontos de esgoto e água",
      "Abrir as valas",
      "Assentar o esgoto conferindo o caimento",
      "Assentar a tubulação de água fria",
      "Caixa de inspeção e fossa / sumidouro",
      "Teste de estanqueidade",
      "Conferir ponto a ponto contra o projeto",
    ],
  },
  {
    name: "Radier",
    deliverable: "Laje de fundação concretada e curada",
    dependsOn: "Infra enterrada",
    days: 4,
    tasks: [
      "Lona plástica sobre o solo",
      "Tela soldada com espaçadores",
      "Conferir as passagens de tubo antes de concretar",
      "Concretagem",
      "Nivelamento e acabamento",
      "Cura úmida (7 dias)",
    ],
  },
  {
    name: "Muro frontal",
    deliverable: "Frente fechada",
    dependsOn: "Radier (ou Mobilização, se deixar vão de obra)",
    days: 4,
    tasks: [
      "Locação do muro",
      "Fundação — brocas ou baldrame",
      "Pilaretes",
      "Elevação da alvenaria",
      "Cinta de amarração no topo",
      "Chapisco e reboco das duas faces",
      "Portão, se houver",
    ],
  },
  {
    name: "Alvenaria e estrutura",
    deliverable: "Paredes, pilares, vigas, vergas e platibanda",
    dependsOn: "Radier",
    days: 20,
    tasks: [
      "Marcação da primeira fiada",
      "Elevação das paredes",
      "Formas e armadura dos pilares",
      "Concretagem dos pilares",
      "Vergas e contravergas sobre portas e janelas",
      "Cinta de amarração e vigas",
      "Platibanda",
      "Conferir prumo e esquadro",
    ],
  },
  {
    name: "Laje de forro",
    deliverable: "Teto concretado e curado",
    dependsOn: "Alvenaria",
    days: 5,
    tasks: [
      "Escoramento",
      "Assentar vigotas e lajotas",
      "Armadura de distribuição",
      "Conferir as passagens elétricas",
      "Concretagem da capa",
      "Cura e retirada do escoramento",
    ],
  },
  {
    name: "Cobertura",
    deliverable: "Casa coberta e estanque — inclui rufo e calha",
    dependsOn: "Laje",
    days: 5,
    tasks: [
      "Madeiramento — linha, barrote, caibro e ripa",
      "Conferir alinhamento e caimento",
      "Assentar telhas respeitando o recobrimento",
      "Cumeeira",
      "Rufo no encontro com a platibanda",
      "Calha e condutor de descida",
    ],
  },
  {
    name: "Instalações embutidas",
    deliverable: "Eletrodutos, caixas e tubos dentro das paredes",
    dependsOn: "Cobertura",
    days: 6,
    tasks: [
      "Marcar a altura dos pontos",
      "Rasgos na alvenaria",
      "Eletrodutos e caixas",
      "Tubulação de água fria nas paredes",
      "Esgoto de parede",
      "Teste de pressão antes de fechar",
      "Fechamento dos rasgos",
    ],
  },
  {
    name: "Esquadrias",
    deliverable: "Batentes e contramarcos chumbados",
    dependsOn: "Instalações embutidas",
    days: 3,
    tasks: [
      "Conferir os vãos",
      "Chumbar os batentes das portas",
      "Chumbar os contramarcos das janelas",
      "Conferir prumo e nível",
      "Proteger até a pintura",
    ],
  },
  {
    name: "Revestimentos",
    deliverable: "Chapisco, reboco, contrapiso, piso e azulejo",
    dependsOn: "Esquadrias",
    days: 22,
    tasks: [
      "Chapisco nas paredes",
      "Taliscas e mestras",
      "Reboco interno",
      "Reboco externo",
      "Contrapiso com caimento nas áreas molhadas",
      "Impermeabilização dos boxes e da área de serviço",
      "Assentar o piso",
      "Assentar o azulejo",
      "Rejunte",
    ],
  },
  {
    name: "Gesso liso e pintura",
    deliverable: "Paredes acabadas",
    dependsOn: "Revestimentos",
    days: 12,
    tasks: [
      "Aplicar o gesso liso",
      "Lixar",
      "Selador",
      "1ª demão de tinta",
      "2ª demão de tinta",
      "Retoques",
    ],
  },
  {
    name: "Louças, metais e bancadas",
    deliverable: "Banheiros e cozinha montados",
    dependsOn: "Gesso e pintura",
    days: 5,
    tasks: [
      "Bancada da cozinha",
      "Cuba e torneira da cozinha",
      "Vasos sanitários",
      "Lavatórios e torneiras",
      "Chuveiros e registros",
      "Acessórios dos banheiros",
    ],
  },
  {
    name: "Elétrica e hidráulica finais",
    deliverable: "Fiação, quadro, tomadas, luminárias, registros",
    dependsOn: "Gesso e pintura",
    days: 5,
    tasks: [
      "Passar a fiação",
      "Montar o quadro de distribuição",
      "Tomadas e interruptores",
      "Luminárias",
      "Acabamento dos registros",
      "Testar todos os circuitos",
      "Testar pressão e procurar vazamentos",
    ],
  },
  {
    name: "Limpeza e entrega",
    deliverable: "Obra limpa, testes feitos, vistoria",
    dependsOn: "Louças e Elétrica",
    days: 2,
    tasks: [
      "Retirar entulho",
      "Limpeza fina",
      "Testar portas e janelas",
      "Vistoria final",
      "Entrega das chaves",
    ],
  },
];

export const STAGE_STATUS = [
  { value: "PENDENTE", label: "Pendente" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "CONCLUIDA", label: "Concluída" },
] as const;
