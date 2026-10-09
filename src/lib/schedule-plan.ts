// Programação semanal da obra.
//
// O usuário informa início e prazo; o período vira uma grade de semanas
// (segunda a domingo) e em cada semana ele inclui as etapas que vão ser
// trabalhadas. Nada aqui segue a sequência do cronograma à força: a obra
// raramente anda em linha, e a programação é justamente onde se registra o
// que vai ser feito de fato.
//
// O material da semana é calculado e depois revisável. Uma etapa que aparece
// em N semanas reparte o seu material em N partes iguais — sem isso o material
// inteiro da etapa seria cobrado em cada uma das semanas. A revisão do usuário
// substitui o calculado só na linha em que ele mexeu.

import { planejarEtapas, segundaISO, somarDias } from "./schedule-weeks";

export type PlanStage = {
  id: string;
  name: string;
  status: string;
  days: number;
  startDate: string | null;
  materials: { materialId: string; name: string; unit: string; quantity: number }[];
};

export type WeekOverride = {
  materialId: string; name: string; unit: string; quantity: number;
  stageId?: string | null; // origem escolhida pelo usuário
};

export type PlanWeekMaterial = {
  materialId: string;
  name: string;
  unit: string;
  auto: number;          // o que o cálculo daria
  quantity: number;      // o que vale (revisado ou automático)
  revisado: boolean;
  etapas: string[];
  origemId: string | null; // etapa escolhida como origem; nula = calculada
};

/** Segundas-feiras do início ao prazo, inclusive. */
export function semanasDoPeriodo(inicio: string | null, fim: string | null): string[] {
  if (!inicio || !fim || fim < inicio) return [];
  const out: string[] = [];
  let seg = segundaISO(inicio);
  const ultima = segundaISO(fim);
  // Trava contra prazo absurdo digitado por engano (ano errado, por exemplo).
  while (seg <= ultima && out.length < 260) {
    out.push(seg);
    seg = somarDias(seg, 7);
  }
  return out;
}

/** Em quantas semanas cada etapa foi programada. */
export function semanasPorEtapa(assign: { stageId: string; weekStart: string }[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const a of assign) {
    const l = m.get(a.stageId) ?? [];
    l.push(a.weekStart);
    m.set(a.stageId, l);
  }
  for (const l of m.values()) l.sort();
  return m;
}

export function materiaisDaSemana(
  semana: string,
  stages: PlanStage[],
  porEtapa: Map<string, string[]>,
  overrides: WeekOverride[]
): PlanWeekMaterial[] {
  const acc = new Map<string, PlanWeekMaterial>();

  for (const st of stages) {
    const semanas = porEtapa.get(st.id) ?? [];
    if (!semanas.includes(semana)) continue;
    const fracao = 1 / semanas.length;
    for (const m of st.materials) {
      const a = acc.get(m.materialId) ?? {
        materialId: m.materialId, name: m.name, unit: m.unit,
        auto: 0, quantity: 0, revisado: false, etapas: [], origemId: null,
      };
      a.auto += m.quantity * fracao;
      if (!a.etapas.includes(st.name)) a.etapas.push(st.name);
      acc.set(m.materialId, a);
    }
  }

  for (const a of acc.values()) a.quantity = arred(a.auto);

  const nomeDe = new Map(stages.map((s) => [s.id, s.name]));
  for (const o of overrides) {
    const a = acc.get(o.materialId);
    if (a) {
      // A revisão só conta como revisão de quantidade se mudou o número: quem
      // apenas escolheu a origem não "revisou" a linha.
      if (o.quantity !== arred(a.auto)) a.revisado = true;
      a.quantity = o.quantity;
    } else {
      // Material que nenhuma etapa da semana tem: acréscimo manual.
      acc.set(o.materialId, {
        materialId: o.materialId, name: o.name, unit: o.unit,
        auto: 0, quantity: o.quantity, revisado: true, etapas: [], origemId: null,
      });
    }
    if (o.stageId && nomeDe.has(o.stageId)) {
      const l = acc.get(o.materialId)!;
      l.origemId = o.stageId;
      l.etapas = [nomeDe.get(o.stageId)!];
    }
  }

  return [...acc.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function arred(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Previsto de cada etapa: da segunda da primeira semana marcada à sexta da
 * última. Etapa sem semana fica SEM previsto.
 *
 * Já houve um fallback aqui — etapa sem semana caía no cronograma sequencial
 * (ordem + duração). Ele produzia datas que o usuário nunca definiu: somava as
 * durações como se nenhuma etapa se sobrepusesse, ignorava o início que ele
 * tinha posto e, pior, era isso que ia para a linha de base quando ele
 * congelava antes de marcar as semanas. Previsto é o que o usuário marca.
 */
export function previstoPorEtapa(
  stages: { id: string }[],
  porEtapa: Map<string, string[]>
): Map<string, { inicio: string; fim: string }> {
  const out = new Map<string, { inicio: string; fim: string }>();
  for (const st of stages) {
    const semanas = porEtapa.get(st.id);
    if (semanas && semanas.length > 0) {
      out.set(st.id, { inicio: semanas[0], fim: somarDias(semanas[semanas.length - 1], 4) });
    }
  }
  return out;
}

/**
 * Sugestão de distribuição: põe cada etapa nas semanas que a sequência do
 * cronograma (ordem + dias úteis) ocupa. Ponto de partida para a programação,
 * não regra — o usuário mexe à vontade depois.
 */
export function sugestaoDeSemanas(stages: PlanStage[], inicio: string | null): { stageId: string; weekStart: string }[] {
  const out: { stageId: string; weekStart: string }[] = [];
  for (const p of planejarEtapas(stages.map((s) => ({ ...s, materials: [] })), inicio)) {
    const semanas = new Set(p.dias.map(segundaISO));
    for (const w of semanas) out.push({ stageId: p.id, weekStart: w });
  }
  return out;
}
