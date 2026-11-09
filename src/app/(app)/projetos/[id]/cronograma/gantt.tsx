"use client";

// Gantt da obra. Em vez de empilhar todas as barras numa linha só, a tela
// compara duas coisas de cada vez, escolhidas no seletor:
//   Inicial                    — o plano congelado, sozinho;
//   Revisões                   — uma revisão (R1, R2…) ou a programação atual;
//   Inicial × Realizado        — quanto o realizado se afastou do plano original;
//   Última revisão × Realizado — o mesmo contra o plano em vigor.
// "Última revisão" é a programação de hoje (as semanas marcadas): é ela que
// vale no dia a dia. As revisões salvas guardam o histórico.

import { useMemo, useState } from "react";
import { Lock, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dataBR, segundaISO, somarDias, diasUteisEntre } from "@/lib/schedule-weeks";
import { semanasPorEtapa, previstoPorEtapa, type PlanStage } from "@/lib/schedule-plan";
import { periodoBR, type Pausa } from "@/lib/schedule-pauses";
import { deleteScheduleRevision, freezeBaseline, saveScheduleRevision } from "@/app/actions/schedule";

type Run = (fn: () => Promise<{ error?: string } | void>) => void;

export type GanttStage = PlanStage & {
  realStart: string | null;
  realEnd: string | null;
  baselineStart: string | null;
  baselineEnd: string | null;
};

type Periodo = { inicio: string; fim: string };

export type Revisao = {
  id: string;
  numero: number;
  motivo: string | null;
  criadaEm: string; // ISO
  etapas: Record<string, Periodo>;
};

type Modo = "inicial" | "revisoes" | "inicialReal" | "atualReal";
const MODOS: { v: Modo; rotulo: string }[] = [
  { v: "inicial", rotulo: "Inicial" },
  { v: "revisoes", rotulo: "Revisões" },
  { v: "inicialReal", rotulo: "Inicial × Realizado" },
  { v: "atualReal", rotulo: "Última revisão × Realizado" },
];

const COL = 34; // px por semana
const DIA = 86400000;
const ATUAL = "atual";

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function diasCorridos(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DIA);
}

function dias(n: number) {
  return Math.abs(n) === 1 ? "1 dia útil" : `${Math.abs(n)} dias úteis`;
}

export function Gantt({
  projectId, inicio, fim, stages, weekStages, baselineAt, pausas, revisoes, isPending, run,
}: {
  projectId: string;
  inicio: string | null;
  fim: string | null;
  stages: GanttStage[];
  weekStages: { stageId: string; weekStart: string }[];
  baselineAt: string | null;
  pausas: Pausa[];
  revisoes: Revisao[];
  isPending: boolean;
  run: Run;
}) {
  const hoje = hojeISO();
  const [modo, setModo] = useState<Modo>("atualReal");
  const [revSel, setRevSel] = useState<string>(ATUAL);

  // Programação de hoje = última revisão em vigor.
  const atual = useMemo(
    () => previstoPorEtapa(stages, semanasPorEtapa(weekStages)),
    [stages, weekStages]
  );
  const inicialDe = (s: GanttStage): Periodo | null =>
    s.baselineStart && s.baselineEnd ? { inicio: s.baselineStart, fim: s.baselineEnd } : null;
  const temInicial = stages.some((s) => inicialDe(s));

  const ultimaSalva = revisoes.at(-1) ?? null;
  // A programação mudou depois da última revisão salva? Aí vale lembrar de salvar.
  const mudouDesdeUltima = !!ultimaSalva && stages.some((s) => {
    const a = atual.get(s.id);
    const r = ultimaSalva.etapas[s.id];
    if (!a && !r) return false;
    return !a || !r || a.inicio !== r.inicio || a.fim !== r.fim;
  });

  const revisaoEscolhida = revSel === ATUAL ? null : revisoes.find((r) => r.id === revSel) ?? null;

  // Qual plano a barra de cima mostra, conforme o modo.
  const planoDe = (s: GanttStage): Periodo | null => {
    if (modo === "inicial" || modo === "inicialReal") return inicialDe(s) ?? (temInicial ? null : atual.get(s.id) ?? null);
    if (modo === "revisoes") return revisaoEscolhida ? revisaoEscolhida.etapas[s.id] ?? null : atual.get(s.id) ?? null;
    return atual.get(s.id) ?? null;
  };
  const comReal = modo === "inicialReal" || modo === "atualReal";
  const planoEhInicial = modo === "inicial" || modo === "inicialReal";

  const linhas = stages.map((s) => {
    const plano = planoDe(s);
    const realFim = s.realEnd ?? (s.realStart ? hoje : null);
    const real = comReal && s.realStart ? { inicio: s.realStart, fim: realFim! } : null;

    // Texto de desvio, sempre contra o que está na tela.
    let nota: { txt: string; cor: string } | null = null;
    if (comReal && plano && s.realEnd) {
      const d = diasUteisEntre(plano.fim, s.realEnd);
      if (d !== 0) nota = { txt: d > 0 ? `${dias(d)} de atraso` : `${dias(d)} adiantada`, cor: d > 0 ? "text-red-600" : "text-green-700" };
    } else if (comReal && plano && s.realStart && !s.realEnd && hoje > plano.fim) {
      const d = diasUteisEntre(plano.fim, hoje);
      if (d > 0) nota = { txt: `em andamento, ${dias(d)} além do previsto`, cor: "text-red-600" };
    } else if (modo === "revisoes" && plano) {
      // Revisão sozinha: o que interessa é o quanto ela andou em relação ao inicial.
      const ini = inicialDe(s);
      if (ini) {
        const d = diasUteisEntre(ini.fim, plano.fim);
        if (d !== 0) nota = { txt: `${d > 0 ? "+" : "−"}${dias(d)} em relação ao inicial`, cor: d > 0 ? "text-amber-700" : "text-green-700" };
      }
    }
    return { s, plano, real, nota };
  });

  // Janela do gráfico: do primeiro ao último dia que aparece em qualquer barra.
  const datas = [
    inicio, fim,
    ...pausas.flatMap((p) => [p.startDate, p.endDate]),
    ...linhas.flatMap((l) => [l.plano?.inicio, l.plano?.fim, l.real?.inicio, l.real?.fim]),
  ].filter((d): d is string => !!d).sort();

  if (datas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-ink-2">
          Informe o <strong>início da obra</strong> para montar o Gantt.
        </CardContent>
      </Card>
    );
  }

  const ini = segundaISO(datas[0]);
  const fimJanela = somarDias(segundaISO(datas[datas.length - 1]), 6);
  const nSemanas = Math.ceil((diasCorridos(ini, fimJanela) + 1) / 7);
  const largura = nSemanas * COL;
  const x = (d: string) => (diasCorridos(ini, d) / 7) * COL;
  const w = (a: string, b: string) => Math.max(((diasCorridos(a, b) + 1) / 7) * COL, 4);

  function salvarRevisao() {
    const motivo = window.prompt(
      `Salvar a programação de hoje como R${(ultimaSalva?.numero ?? 0) + 1}.\n\nMotivo da revisão (ex.: chuva, falta de material, remanejamento):`
    );
    if (motivo === null) return;
    run(() => saveScheduleRevision(projectId, motivo));
  }

  const corPlano = planoEhInicial ? "bg-gray-300" : "bg-amber-300";
  const rotuloPlano = planoEhInicial
    ? "plano inicial"
    : modo === "revisoes" && revisaoEscolhida
      ? `R${revisaoEscolhida.numero}`
      : "última revisão";

  return (
    <div className="flex flex-col gap-3">
      {/* Plano inicial e revisões */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {!temInicial ? (
          <>
            <Button variant="outline" size="sm" disabled={isPending} onClick={() => run(() => freezeBaseline(projectId))}>
              <Lock className="w-4 h-4" />
              Congelar plano inicial
            </Button>
            <span className="text-ink-3">
              Plano inicial ainda não congelado. Congele antes de registrar paradas — é contra ele que
              as revisões e o realizado são comparados.
            </span>
          </>
        ) : (
          <>
            <span className="text-ink-2">
              <Lock className="inline w-3.5 h-3.5 -mt-0.5 mr-1 text-ink-3" />
              Plano inicial congelado{baselineAt ? ` em ${new Date(baselineAt).toLocaleDateString("pt-BR")}` : ""}
            </span>
            <Button variant="outline" size="sm" disabled={isPending} onClick={salvarRevisao}>
              <Save className="w-4 h-4" />
              Salvar revisão
            </Button>
            {mudouDesdeUltima && (
              <span className="text-xs text-amber-700">
                A programação mudou desde a R{ultimaSalva!.numero} — salve uma revisão para guardar esta versão.
              </span>
            )}
            <div className="flex-1" />
            <button
              type="button"
              disabled={isPending}
              className="text-xs text-ink-3 underline hover:text-red-600"
              onClick={() => {
                if (!confirm("Redefinir o plano inicial com a programação de hoje?\n\nO plano original se perde e todas as comparações passam a usar o novo. Use só se o inicial foi congelado por engano.")) return;
                run(() => freezeBaseline(projectId));
              }}
            >
              redefinir plano inicial
            </button>
          </>
        )}
      </div>

      {/* Seletor do que comparar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-full bg-white p-1 text-xs shadow-card">
          {MODOS.map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => setModo(m.v)}
              className={`rounded-full px-3 py-1.5 font-semibold ${
                modo === m.v ? "grad-brand text-white" : "text-ink-2 hover:bg-surface"
              }`}
            >
              {m.rotulo}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Legenda plano={rotuloPlano} corPlano={corPlano} comReal={comReal} />
      </div>

      {modo === "revisoes" && (
        <div className="flex flex-wrap items-center gap-2">
          <ChipRevisao
            ativo={revSel === ATUAL}
            onClick={() => setRevSel(ATUAL)}
            titulo="Atual"
            sub="programação de hoje"
          />
          {[...revisoes].reverse().map((r) => (
            <ChipRevisao
              key={r.id}
              ativo={revSel === r.id}
              onClick={() => setRevSel(r.id)}
              titulo={`R${r.numero}`}
              sub={`${new Date(r.criadaEm).toLocaleDateString("pt-BR")}${r.motivo ? ` · ${r.motivo}` : ""}`}
            />
          ))}
          {revisaoEscolhida && (
            <button
              type="button"
              disabled={isPending}
              aria-label={`Apagar a revisão R${revisaoEscolhida.numero}`}
              title="Apagar esta revisão do histórico"
              onClick={() => {
                if (!confirm(`Apagar a R${revisaoEscolhida.numero} do histórico?`)) return;
                setRevSel(ATUAL);
                run(() => deleteScheduleRevision(revisaoEscolhida.id));
              }}
              className="text-ink-3 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {revisoes.length === 0 && (
            <span className="text-xs text-ink-3">
              Nenhuma revisão salva ainda. Elas nascem a cada parada registrada e pelo botão Salvar revisão.
            </span>
          )}
        </div>
      )}

      <Card>
        <CardContent className="py-3">
          <div className="overflow-x-auto">
            <div style={{ minWidth: largura + 220 }}>
              {/* Cabeçalho de semanas */}
              <div className="flex border-b border-line text-[10px] text-ink-3">
                <div className="w-[220px] shrink-0" />
                <div className="relative" style={{ width: largura, height: 22 }}>
                  {Array.from({ length: nSemanas }, (_, i) => {
                    const seg = somarDias(ini, i * 7);
                    return (
                      <div key={seg} className="absolute top-0 h-full border-l border-gray-100 pl-0.5" style={{ left: i * COL, width: COL }}>
                        {dataBR(seg)}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Faixa das paradas, por trás das barras */}
              {pausas.length > 0 && (
                <div className="relative" style={{ marginLeft: 220, width: largura, height: 0 }}>
                  {pausas
                    .filter((p) => p.endDate >= ini && p.startDate <= fimJanela)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="absolute bg-amber-100/60 border-x border-amber-300 pointer-events-none"
                        style={{ left: x(p.startDate), width: w(p.startDate, p.endDate), top: 0, height: linhas.length * 31 }}
                        title={`Obra parada: ${periodoBR(p.startDate, p.endDate)}${p.reason ? ` — ${p.reason}` : ""}`}
                      />
                    ))}
                </div>
              )}

              {linhas.map(({ s, plano, real, nota }) => (
                <div key={s.id} className="flex items-center border-b border-gray-50 hover:bg-gray-50/60">
                  <div className="w-[220px] shrink-0 pr-2 py-1.5">
                    <p className="text-sm text-ink truncate" title={s.name}>{s.name}</p>
                    {nota && <p className={`text-[11px] ${nota.cor}`}>{nota.txt}</p>}
                  </div>
                  <div className="relative" style={{ width: largura, height: 30 }}>
                    {plano && (
                      <div
                        className={`absolute h-[9px] rounded-sm ${corPlano} ${comReal ? "top-[5px]" : "top-[11px]"}`}
                        style={{ left: x(plano.inicio), width: w(plano.inicio, plano.fim) }}
                        title={`${rotuloPlano}: ${dataBR(plano.inicio)} a ${dataBR(plano.fim)}`}
                      />
                    )}
                    {real && (
                      <div
                        className={`absolute top-[16px] h-[9px] rounded-sm ${
                          !s.realEnd ? "bg-brand-500"
                            : plano && s.realEnd > plano.fim ? "bg-red-500" : "bg-green-500"
                        }`}
                        style={{ left: x(real.inicio), width: w(real.inicio, real.fim) }}
                        title={`Realizado: ${dataBR(real.inicio)} a ${s.realEnd ? dataBR(s.realEnd) : "em andamento"}`}
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* Linhas verticais de hoje e do fim previsto da obra */}
              <div className="relative" style={{ marginLeft: 220, width: largura, height: 0 }}>
                {[{ d: hoje, cor: "bg-amber-500", rot: "hoje" }, ...(fim ? [{ d: fim, cor: "bg-gray-900", rot: "fim previsto" }] : [])]
                  .filter((m) => m.d >= ini && m.d <= fimJanela)
                  .map((m) => (
                    <div
                      key={m.rot}
                      className={`absolute w-px ${m.cor} opacity-70 pointer-events-none`}
                      style={{ left: x(m.d), bottom: 0, height: linhas.length * 31 + 22 }}
                    >
                      <span className={`absolute -top-0 left-1 text-[10px] font-semibold whitespace-nowrap ${m.rot === "hoje" ? "text-amber-600" : "text-gray-900"}`}>
                        {m.rot}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-ink-3">
        O plano vem das <strong>semanas marcadas</strong> em cada etapa; a última revisão é a programação de
        hoje. O realizado vem do <strong>início real</strong> e do <strong>fim real</strong>, na aba Etapas —
        etapa iniciada e não terminada aparece em azul até hoje.
      </p>
    </div>
  );
}

function ChipRevisao({
  ativo, onClick, titulo, sub,
}: {
  ativo: boolean;
  onClick: () => void;
  titulo: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={sub}
      className={`flex max-w-[22rem] items-baseline gap-1.5 rounded-full border-[1.5px] px-3 py-1 text-xs ${
        ativo ? "border-transparent grad-brand text-white" : "border-line bg-white text-ink-2 hover:border-line-strong"
      }`}
    >
      <strong>{titulo}</strong>
      <span className={`truncate ${ativo ? "text-white/80" : "text-ink-3"}`}>{sub}</span>
    </button>
  );
}

function Legenda({ plano, corPlano, comReal }: { plano: string; corPlano: string; comReal: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
      <span className="flex items-center gap-1"><span className={`inline-block w-4 h-2 rounded-sm ${corPlano}`} /> {plano}</span>
      {comReal && (
        <>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-2 rounded-sm bg-green-500" /> no prazo</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-2 rounded-sm bg-red-500" /> atrasada</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-2 rounded-sm bg-brand-500" /> em andamento</span>
        </>
      )}
      <span className="flex items-center gap-1"><span className="inline-block w-4 h-2 rounded-sm bg-amber-100 border-x border-amber-300" /> obra parada</span>
    </div>
  );
}
