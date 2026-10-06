// Distribui as etapas do cronograma em semanas de calendário.
//
// A obra corre em sequência: cada etapa começa quando a anterior termina e
// consome os seus dias ÚTEIS — sábado e domingo não contam, porque é assim que
// a duração foi estimada ("102 dias úteis"). Uma etapa com data de início
// própria ancora ali e empurra as seguintes; é o que permite marcar uma parada
// (espera de material, chuva) sem recalcular o resto à mão.
//
// Etapa de duração zero (a pré-obra, por exemplo) não ocupa dia nenhum: aparece
// na semana em que começa e não atrasa a próxima.

export type WeekStage = {
  id: string;
  name: string;
  status: string;
  inicio: string;      // ISO yyyy-mm-dd
  fim: string;         // ISO yyyy-mm-dd
  diasNaSemana: number; // dias úteis desta etapa dentro desta semana
  marco: boolean;       // duração zero: aparece na semana sem ocupar dia
};

export type WeekMaterial = {
  name: string;
  unit: string;
  quantity: number;
  etapas: string[];
};

export type Week = {
  numero: number;
  inicio: string;  // segunda-feira
  fim: string;     // domingo
  etapas: WeekStage[];
  materiais: WeekMaterial[];
};

type StageIn = {
  id: string;
  name: string;
  status: string;
  days: number;
  startDate: string | null;
  materials: { name: string; unit: string; quantity: number }[];
};

const DIA = 86400000;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Meio-dia evita a data andar um dia ao cruzar fuso nas conversões.
function paraData(isoStr: string): Date {
  return new Date(`${isoStr}T12:00:00Z`);
}

function ehFimDeSemana(d: Date): boolean {
  const dia = d.getUTCDay();
  return dia === 0 || dia === 6;
}

function proximoDiaUtil(d: Date): Date {
  const out = new Date(d);
  while (ehFimDeSemana(out)) out.setUTCDate(out.getUTCDate() + 1);
  return out;
}

/** Segunda-feira da semana de `d`. */
function segundaDa(d: Date): Date {
  const out = new Date(d);
  const dia = out.getUTCDay();         // 0 dom … 6 sáb
  const recuo = dia === 0 ? 6 : dia - 1;
  out.setUTCDate(out.getUTCDate() - recuo);
  return out;
}

/**
 * Percorre as etapas na ordem recebida e devolve as semanas ocupadas.
 *
 * `inicio` é a data de início da obra (ISO). Sem ela não há como posicionar
 * nada no calendário, então a função devolve lista vazia — a tela é que pede a
 * data ao usuário.
 */
export function montarSemanas(stages: StageIn[], inicio: string | null): Week[] {
  if (!inicio || stages.length === 0) return [];

  let cursor = proximoDiaUtil(paraData(inicio));
  // dia ISO → etapas que trabalham nele
  const diasPorEtapa = new Map<string, Date[]>();
  const periodo = new Map<string, { inicio: Date; fim: Date }>();

  for (const st of stages) {
    // Data própria manda e empurra o restante da fila.
    if (st.startDate) {
      const propria = proximoDiaUtil(paraData(st.startDate));
      if (propria > cursor) cursor = propria;
    }

    const dias = Math.max(0, Math.round(st.days));
    const trabalhados: Date[] = [];

    if (dias === 0) {
      // Marco sem duração: aparece no dia corrente, sem consumi-lo.
      periodo.set(st.id, { inicio: new Date(cursor), fim: new Date(cursor) });
      diasPorEtapa.set(st.id, [new Date(cursor)]);
      continue;
    }

    const primeiro = new Date(cursor);
    for (let i = 0; i < dias; i++) {
      cursor = proximoDiaUtil(cursor);
      trabalhados.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + DIA);
      cursor = proximoDiaUtil(cursor);
    }
    periodo.set(st.id, {
      inicio: proximoDiaUtil(primeiro),
      fim: trabalhados[trabalhados.length - 1],
    });
    diasPorEtapa.set(st.id, trabalhados);
  }

  // Agrupa por semana de calendário (segunda a domingo).
  const porSemana = new Map<string, Map<string, number>>(); // segundaISO → etapaId → dias
  for (const [stageId, dias] of diasPorEtapa) {
    for (const d of dias) {
      const chave = iso(segundaDa(d));
      const semana = porSemana.get(chave) ?? new Map<string, number>();
      semana.set(stageId, (semana.get(stageId) ?? 0) + 1);
      porSemana.set(chave, semana);
    }
  }

  const porId = new Map(stages.map((s) => [s.id, s]));

  return [...porSemana.keys()]
    .sort()
    .map((segunda, i) => {
      const inicioSemana = paraData(segunda);
      const fimSemana = new Date(inicioSemana.getTime() + 6 * DIA);
      const mapa = porSemana.get(segunda)!;

      const etapas: WeekStage[] = [...mapa.entries()]
        .map(([stageId, diasNaSemana]) => {
          const st = porId.get(stageId)!;
          const p = periodo.get(stageId)!;
          return {
            id: st.id,
            name: st.name,
            status: st.status,
            inicio: iso(p.inicio),
            fim: iso(p.fim),
            diasNaSemana,
            marco: st.days <= 0,
          };
        })
        // Mantém a ordem do cronograma, não a alfabética.
        .sort((a, b) => stages.findIndex((s) => s.id === a.id) - stages.findIndex((s) => s.id === b.id));

      // Material da semana = o das etapas que trabalham nela. O mesmo material
      // em duas etapas vira uma linha só — na hora de comprar o que importa é
      // o total da semana.
      const acc = new Map<string, WeekMaterial>();
      for (const e of etapas) {
        const st = porId.get(e.id)!;
        for (const m of st.materials) {
          const k = `${m.name}|${m.unit}`;
          const atual = acc.get(k) ?? { name: m.name, unit: m.unit, quantity: 0, etapas: [] };
          atual.quantity += m.quantity;
          if (!atual.etapas.includes(st.name)) atual.etapas.push(st.name);
          acc.set(k, atual);
        }
      }

      return {
        numero: i + 1,
        inicio: segunda,
        fim: iso(fimSemana),
        etapas,
        materiais: [...acc.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      };
    });
}

export function dataBR(isoStr: string): string {
  const [a, m, d] = isoStr.split("-");
  return `${d}/${m}`;
}
