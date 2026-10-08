"use client";

import { useMemo } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dataBR, segundaISO, somarDias, diasUteisEntre } from "@/lib/schedule-weeks";
import { semanasPorEtapa, previstoPorEtapa, type PlanStage } from "@/lib/schedule-plan";
import { freezeBaseline } from "@/app/actions/schedule";

type Run = (fn: () => Promise<{ error?: string } | void>) => void;

export type GanttStage = PlanStage & {
  realStart: string | null;
  realEnd: string | null;
  baselineStart: string | null;
  baselineEnd: string | null;
};

const COL = 34; // px por semana
const DIA = 86400000;

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function diasCorridos(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DIA);
}

export function Gantt({
  projectId, inicio, fim, stages, weekStages, baselineAt, isPending, run,
}: {
  projectId: string;
  inicio: string | null;
  fim: string | null;
  stages: GanttStage[];
  weekStages: { stageId: string; weekStart: string }[];
  baselineAt: string | null;
  isPending: boolean;
  run: Run;
}) {
  const hoje = hojeISO();

  const previsto = useMemo(
    () => previstoPorEtapa(stages, semanasPorEtapa(weekStages)),
    [stages, weekStages]
  );

  // Linha de base congelada manda; sem ela, mostra o previsto atual tracejado,
  // deixando claro que ainda não é um compromisso.
  const linhas = stages.map((s) => {
    const congelada = s.baselineStart && s.baselineEnd ? { inicio: s.baselineStart, fim: s.baselineEnd } : null;
    const base = congelada ?? previsto.get(s.id) ?? null;
    const realFim = s.realEnd ?? (s.realStart ? hoje : null);
    return { s, base, congelada: !!congelada, real: s.realStart ? { inicio: s.realStart, fim: realFim! } : null };
  });

  // Janela do gráfico: do primeiro ao último dia que aparece em qualquer barra.
  const datas = [
    inicio, fim,
    ...linhas.flatMap((l) => [l.base?.inicio, l.base?.fim, l.real?.inicio, l.real?.fim]),
  ].filter((d): d is string => !!d).sort();

  if (datas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-600">
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

  const temCongelada = linhas.some((l) => l.congelada);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Button
          variant="outline" size="sm" disabled={isPending}
          onClick={() => {
            if (temCongelada && !confirm("Substituir a linha de base atual pelo previsto de agora? O desvio passa a ser medido contra o novo plano.")) return;
            run(() => freezeBaseline(projectId));
          }}
        >
          <Lock className="w-4 h-4" />
          {temCongelada ? "Recongelar linha de base" : "Congelar linha de base"}
        </Button>
        <span className="text-gray-500">
          {baselineAt
            ? `Linha de base congelada em ${new Date(baselineAt).toLocaleDateString("pt-BR")}`
            : "Linha de base ainda não congelada — o tracejado mostra as semanas marcadas hoje e muda junto com elas."}
        </span>
        <div className="flex-1" />
        <Legenda />
      </div>

      <Card>
        <CardContent className="py-3">
          <div className="overflow-x-auto">
            <div style={{ minWidth: largura + 220 }}>
              {/* Cabeçalho de semanas */}
              <div className="flex border-b border-gray-200 text-[10px] text-gray-500">
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

              {linhas.map(({ s, base, congelada, real }) => {
                const desvio = real?.fim && base && s.realEnd ? diasUteisEntre(base.fim, s.realEnd) : null;
                return (
                  <div key={s.id} className="flex items-center border-b border-gray-50 hover:bg-gray-50/60">
                    <div className="w-[220px] shrink-0 pr-2 py-1.5">
                      <p className="text-sm text-gray-800 truncate" title={s.name}>{s.name}</p>
                      {desvio !== null && desvio !== 0 && (
                        <p className={`text-[11px] ${desvio > 0 ? "text-red-600" : "text-green-700"}`}>
                          {(() => {
                            const n = Math.abs(desvio);
                            const dias = n === 1 ? "1 dia útil" : `${n} dias úteis`;
                            return desvio > 0 ? `${dias} de atraso` : `${dias} adiantada`;
                          })()}
                        </p>
                      )}
                    </div>
                    <div className="relative" style={{ width: largura, height: 30 }}>
                      {base && (
                        <div
                          className={`absolute top-[5px] h-[9px] rounded-sm ${
                            congelada ? "bg-gray-300" : "border border-dashed border-gray-400 bg-transparent"
                          }`}
                          style={{ left: x(base.inicio), width: w(base.inicio, base.fim) }}
                          title={`Previsto: ${dataBR(base.inicio)} a ${dataBR(base.fim)}`}
                        />
                      )}
                      {real && (
                        <div
                          className={`absolute top-[16px] h-[9px] rounded-sm ${
                            !s.realEnd ? "bg-brand-500"
                              : base && s.realEnd > base.fim ? "bg-red-500" : "bg-green-500"
                          }`}
                          style={{ left: x(real.inicio), width: w(real.inicio, real.fim) }}
                          title={`Realizado: ${dataBR(real.inicio)} a ${s.realEnd ? dataBR(s.realEnd) : "em andamento"}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Linhas verticais de hoje e do fim previsto da obra, sobre o corpo do gráfico */}
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

      <p className="text-xs text-gray-400">
        O previsto vem das <strong>semanas marcadas</strong> em cada etapa; etapa sem semana não tem barra cinza.
        O realizado vem do <strong>início real</strong> e do <strong>fim real</strong>, na aba Etapas.
        Etapa com início real e sem fim aparece em azul até hoje.
      </p>
    </div>
  );
}

function Legenda() {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <span className="flex items-center gap-1"><span className="inline-block w-4 h-2 rounded-sm bg-gray-300" /> previsto</span>
      <span className="flex items-center gap-1"><span className="inline-block w-4 h-2 rounded-sm bg-green-500" /> no prazo</span>
      <span className="flex items-center gap-1"><span className="inline-block w-4 h-2 rounded-sm bg-red-500" /> atrasada</span>
      <span className="flex items-center gap-1"><span className="inline-block w-4 h-2 rounded-sm bg-brand-500" /> em andamento</span>
    </div>
  );
}
