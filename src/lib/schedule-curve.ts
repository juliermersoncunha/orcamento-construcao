// Curva S da obra: quanto do serviço deveria estar pronto a cada semana, e
// quanto está de fato.
//
// O peso de cada etapa é a sua duração em dias úteis. Seria melhor pesar por
// custo, mas o material por etapa quase nunca está preenchido — duração é o
// que todo projeto tem, e é a medida de esforço que o cronograma já usa.
//
// São três linhas, as mesmas do Gantt:
//   previsto    — a linha de base congelada, o plano inicial;
//   replanejado — as semanas marcadas hoje (o que uma parada empurrou);
//   realizado   — etapa concluída conta inteira na semana em que terminou;
//                 etapa em andamento conta a fração do passo a passo feito.
// A linha do realizado para na semana de hoje: adiante dela não há fato.

import { segundaISO, somarDias } from "./schedule-weeks";

export type CurvaStage = {
  id: string;
  name: string;
  days: number;
  status: string;
  baselineStart: string | null;
  baselineEnd: string | null;
  realStart: string | null;
  realEnd: string | null;
  tarefas: { total: number; feitas: number };
};

export type PontoCurva = {
  semana: string;
  previsto: number;              // % acumulado
  replanejado: number | null;
  realizado: number | null;      // nulo depois de hoje
};

export type CurvaS = {
  pontos: PontoCurva[];
  temPrevisto: boolean;
  temReplanejado: boolean;
  previstoHoje: number;
  replanejadoHoje: number | null;
  realizadoHoje: number;
};

/** Segundas-feiras de `inicio` a `fim`, inclusive. */
export function semanasEntre(inicio: string, fim: string): string[] {
  if (!inicio || !fim || fim < inicio) return [];
  const out: string[] = [];
  let seg = segundaISO(inicio);
  const ultima = segundaISO(fim);
  while (seg <= ultima && out.length < 400) {
    out.push(seg);
    seg = somarDias(seg, 7);
  }
  return out;
}

/** Fração concluída de uma etapa, pelo passo a passo quando existe. */
function fracaoFeita(s: CurvaStage): number {
  if (s.status === "CONCLUIDA" || s.realEnd) return 1;
  if (!s.realStart) return 0;
  // Em andamento: o passo a passo é a única medida fina que existe. Sem ele,
  // meia etapa — melhor assumir o meio do caminho do que zero ou tudo.
  if (s.tarefas.total > 0) return s.tarefas.feitas / s.tarefas.total;
  return 0.5;
}

export function montarCurvaS(
  stages: CurvaStage[],
  semanasDaEtapa: Map<string, string[]>,
  hoje: string
): CurvaS {
  // Peso: duração. Projeto sem duração nenhuma cai para peso igual por etapa,
  // senão a curva não existiria.
  const semDuracao = stages.every((s) => s.days <= 0);
  const peso = (s: CurvaStage) => (semDuracao ? 1 : Math.max(0, s.days));
  const total = stages.reduce((acc, s) => acc + peso(s), 0);

  const semanasPrevisto = new Map<string, string[]>();
  for (const s of stages) {
    if (s.baselineStart && s.baselineEnd) {
      semanasPrevisto.set(s.id, semanasEntre(s.baselineStart, s.baselineEnd));
    }
  }

  const temPrevisto = semanasPrevisto.size > 0;
  const temReplanejado = stages.some((s) => {
    const base = semanasPrevisto.get(s.id) ?? [];
    const agora = semanasDaEtapa.get(s.id) ?? [];
    return base.length > 0 && agora.length > 0 && (base[0] !== agora[0] || base.at(-1) !== agora.at(-1));
  });

  // Eixo: da primeira à última semana que qualquer uma das linhas toca.
  const todas = new Set<string>([segundaISO(hoje)]);
  for (const l of semanasPrevisto.values()) for (const w of l) todas.add(w);
  for (const l of semanasDaEtapa.values()) for (const w of l) todas.add(w);
  for (const s of stages) {
    if (s.realStart) todas.add(segundaISO(s.realStart));
    if (s.realEnd) todas.add(segundaISO(s.realEnd));
  }
  const ordenadas = [...todas].sort();
  if (ordenadas.length === 0 || total === 0) {
    return { pontos: [], temPrevisto, temReplanejado, previstoHoje: 0, replanejadoHoje: null, realizadoHoje: 0 };
  }
  const eixo = semanasEntre(ordenadas[0], ordenadas[ordenadas.length - 1]);

  // Ganho de cada semana em cada linha; o acumulado vem depois.
  const ganhoPrevisto = new Map<string, number>();
  const ganhoReplan = new Map<string, number>();
  const ganhoReal = new Map<string, number>();
  const somar = (m: Map<string, number>, semana: string, v: number) =>
    m.set(semana, (m.get(semana) ?? 0) + v);

  for (const s of stages) {
    const p = peso(s);
    if (p <= 0) continue;

    // Etapa espalhada por igual nas suas semanas: dentro de uma semana não há
    // como saber em que dia o serviço andou.
    const base = semanasPrevisto.get(s.id) ?? [];
    for (const w of base) somar(ganhoPrevisto, w, p / base.length);

    const agora = semanasDaEtapa.get(s.id) ?? [];
    for (const w of agora) somar(ganhoReplan, w, p / agora.length);

    const feito = fracaoFeita(s);
    if (feito <= 0) continue;
    if (s.realEnd || s.status === "CONCLUIDA") {
      // Conta inteira na semana em que terminou. Sem fim real, na semana do
      // início real ou na última semana planejada.
      const quando = s.realEnd ?? s.realStart ?? agora.at(-1) ?? base.at(-1);
      if (quando) somar(ganhoReal, segundaISO(quando), p * feito);
    } else if (s.realStart) {
      const semanas = semanasEntre(s.realStart, hoje);
      const lista = semanas.length > 0 ? semanas : [segundaISO(s.realStart)];
      for (const w of lista) somar(ganhoReal, w, (p * feito) / lista.length);
    }
  }

  const semanaDeHoje = segundaISO(hoje);
  let accP = 0, accR = 0, accReal = 0;
  const pontos: PontoCurva[] = eixo.map((w) => {
    accP += ganhoPrevisto.get(w) ?? 0;
    accR += ganhoReplan.get(w) ?? 0;
    accReal += ganhoReal.get(w) ?? 0;
    return {
      semana: w,
      previsto: pct(accP, total),
      replanejado: temReplanejado ? pct(accR, total) : null,
      realizado: w <= semanaDeHoje ? pct(accReal, total) : null,
    };
  });

  const noDia = pontos.filter((p) => p.semana <= semanaDeHoje).at(-1);
  return {
    pontos,
    temPrevisto,
    temReplanejado,
    previstoHoje: noDia?.previsto ?? 0,
    replanejadoHoje: temReplanejado ? noDia?.replanejado ?? 0 : null,
    realizadoHoje: noDia?.realizado ?? 0,
  };
}

function pct(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 1000) / 10 : 0;
}
