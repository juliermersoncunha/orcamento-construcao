// Escopo resumido da reforma, para o topo do relatório do cliente.
//
// Junta os serviços que formam um mesmo trabalho (remover + assentar piso =
// "substituição do piso") e diz onde ele acontece. A ordem segue a sequência
// da obra. Serviços "Outros" entram com o nome que o usuário deu.

type Servico = { serviceKey: string; label: string | null; roomId: string | null };
type Ambiente = { id: string; nome: string };

type Regra = {
  frase: string;
  chaves: string[];
  // Quando presente, a frase muda se algum serviço desta lista existir
  // (ex.: houve remoção → "Substituição"; só assentamento → "Assentamento").
  comRemocao?: { chaves: string[]; frase: string };
};

const REGRAS: Regra[] = [
  { frase: "Demolição de alvenaria", chaves: ["demolir_alvenaria"] },
  { frase: "Assentamento de tijolos (alvenaria)", chaves: ["alvenaria_tijolo"] },
  {
    frase: "Troca de telhas",
    chaves: ["telhado_colonial", "telhado_fibrocimento", "remover_telhado"],
    comRemocao: { chaves: ["remover_telhado"], frase: "Substituição do telhado" },
  },
  { frase: "Refazer madeiramento do telhado", chaves: ["madeiramento"] },
  { frase: "Instalação de calhas e rufos", chaves: ["calhas_rufos"] },
  { frase: "Impermeabilização de laje", chaves: ["impermeabilizar_laje"] },
  { frase: "Calçada / piso de concreto", chaves: ["calcada_concreto"] },
  {
    frase: "Assentamento de piso cerâmico",
    chaves: ["piso_ceramico", "piso_porcelanato", "remover_piso"],
    comRemocao: { chaves: ["remover_piso"], frase: "Substituição do piso cerâmico" },
  },
  {
    frase: "Assentamento de revestimento cerâmico de parede",
    chaves: ["revestimento_parede", "remover_revestimento_parede"],
    comRemocao: { chaves: ["remover_revestimento_parede"], frase: "Substituição do revestimento cerâmico de parede" },
  },
  { frase: "Regularização de contrapiso", chaves: ["contrapiso"] },
  { frase: "Impermeabilização", chaves: ["impermeabilizacao"] },
  {
    frase: "Chapisco e reboco",
    chaves: ["reboco", "remover_reboco"],
    comRemocao: { chaves: ["remover_reboco"], frase: "Substituição de chapisco e reboco" },
  },
  { frase: "Refazer rejunte", chaves: ["rejuntar"] },
  { frase: "Acabamento em gesso liso", chaves: ["gesso_liso"] },
  { frase: "Pintura de paredes", chaves: ["pintura_simples", "pintura_massa"] },
  { frase: "Pintura com cal (caiação)", chaves: ["pintura_cal"] },
  { frase: "Aplicação de textura acrílica", chaves: ["textura_rolo"] },
  { frase: "Pintura de teto", chaves: ["pintura_teto"] },
  { frase: "Instalação de forro", chaves: ["forro"] },
  { frase: "Revisão e substituição da instalação elétrica", chaves: ["eletrica"] },
  { frase: "Revisão da instalação hidráulica", chaves: ["hidraulica"] },
  { frase: "Substituição de louças e metais", chaves: ["loucas_metais"] },
  { frase: "Substituição de esquadrias (portas e janelas)", chaves: ["esquadrias"] },
  { frase: "Instalação de churrasqueira", chaves: ["benf_churrasqueira"] },
  { frase: "Instalação de chuveiro / ducha", chaves: ["benf_chuveiro"] },
  { frase: "Instalação de bancada", chaves: ["benf_bancada"] },
  { frase: "Instalação de pia / tanque", chaves: ["benf_pia_tanque"] },
  { frase: "Pergolado / cobertura de área de lazer", chaves: ["benf_pergolado"] },
];

const EXTERNO = "área externa";

function juntar(nomes: string[]) {
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

function onde(roomIds: (string | null)[], ambientes: Ambiente[]) {
  const ids = new Set(roomIds);
  if (ambientes.length > 1 && ambientes.every((a) => ids.has(a.id))) return "todos os ambientes";
  const nomes = ambientes.filter((a) => ids.has(a.id)).map((a) => a.nome.trim());
  if (ids.has(null)) nomes.push(EXTERNO);
  return juntar(nomes);
}

export function escopoAutomatico(servicos: Servico[], ambientes: Ambiente[]): string[] {
  const linhas: string[] = [];

  for (const r of REGRAS) {
    const doGrupo = servicos.filter((s) => r.chaves.includes(s.serviceKey));
    if (doGrupo.length === 0) continue;
    const frase = r.comRemocao && doGrupo.some((s) => r.comRemocao!.chaves.includes(s.serviceKey))
      ? r.comRemocao.frase
      : r.frase;
    linhas.push(`${frase} — ${onde(doGrupo.map((s) => s.roomId), ambientes)}`);
  }

  // "Outros": um item por nome dado pelo usuário.
  const outros = new Map<string, (string | null)[]>();
  for (const s of servicos) {
    if (s.serviceKey !== "outro" && s.serviceKey !== "benf_outra") continue;
    const nome = (s.label ?? "").trim() || "Serviço complementar";
    outros.set(nome, [...(outros.get(nome) ?? []), s.roomId]);
  }
  for (const [nome, rooms] of outros) linhas.push(`${nome} — ${onde(rooms, ambientes)}`);

  return linhas;
}
