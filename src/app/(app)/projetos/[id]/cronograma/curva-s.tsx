"use client";

// Curva S: o avanço acumulado da obra, semana a semana. Três linhas — plano
// inicial, replanejado e realizado —, como no Gantt, só que em percentual.

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { dataBR } from "@/lib/schedule-weeks";
import { montarCurvaS, type CurvaStage } from "@/lib/schedule-curve";
import { semanasPausadas, type Pausa } from "@/lib/schedule-pauses";

const COL = 46;   // largura de uma semana
const ALT = 220;  // altura útil do gráfico
const ROT = 46;   // faixa do eixo x
const TOPO = 12;  // respiro para o rótulo dos 100% não sair cortado

export function CurvaS({
  stages, semanasDaEtapa, pausas, hoje,
}: {
  stages: CurvaStage[];
  semanasDaEtapa: Map<string, string[]>;
  pausas: Pausa[];
  hoje: string;
}) {
  const curva = useMemo(() => montarCurvaS(stages, semanasDaEtapa, hoje), [stages, semanasDaEtapa, hoje]);
  const paradas = useMemo(() => semanasPausadas(pausas), [pausas]);

  if (curva.pontos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-ink-2">
          Para montar a curva S, marque as semanas das etapas e congele a linha de base na aba{" "}
          <strong>Cronograma</strong>.
        </CardContent>
      </Card>
    );
  }

  const pts = curva.pontos;
  const largura = Math.max(pts.length * COL, 320);
  const x = (i: number) => i * COL + COL / 2;
  const y = (v: number) => TOPO + ALT - (v / 100) * ALT;

  const linha = (valores: (number | null)[]) =>
    valores
      .map((v, i) => (v === null ? null : `${i === 0 || valores[i - 1] === null ? "M" : "L"}${x(i)},${y(v)}`))
      .filter(Boolean)
      .join(" ");

  const iHoje = pts.findIndex((p) => p.realizado === null);
  const xHoje = iHoje === -1 ? x(pts.length - 1) : x(Math.max(0, iHoje - 1));

  const atraso = curva.realizadoHoje - (curva.replanejadoHoje ?? curva.previstoHoje);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Indicador rotulo="Previsto até hoje" valor={curva.previstoHoje} cor="text-ink" />
        {curva.replanejadoHoje !== null && (
          <Indicador rotulo="Replanejado" valor={curva.replanejadoHoje} cor="text-amber-700" />
        )}
        <Indicador rotulo="Realizado" valor={curva.realizadoHoje} cor="text-brand-700" />
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            atraso < -0.05 ? "bg-red-50 text-red-700" : atraso > 0.05 ? "bg-green-50 text-green-700" : "bg-surface text-ink-2"
          }`}
        >
          {atraso < -0.05
            ? `${Math.abs(atraso).toFixed(1).replace(".", ",")} pontos atrás do plano`
            : atraso > 0.05
              ? `${atraso.toFixed(1).replace(".", ",")} pontos à frente`
              : "em dia com o plano"}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-xs text-ink-3">
          <Chave cor="#9aa3ad" rotulo="previsto (linha de base)" />
          {curva.temReplanejado && <Chave cor="#d97706" tracejada rotulo="replanejado" />}
          <Chave cor="#1f49a8" rotulo="realizado" />
        </div>
      </div>

      <Card>
        <CardContent className="py-3">
          <div className="overflow-x-auto">
            <svg width={largura + 44} height={TOPO + ALT + ROT} className="block">
              {/* grade horizontal */}
              {[0, 25, 50, 75, 100].map((v) => (
                <g key={v}>
                  <line x1={40} y1={y(v)} x2={largura + 40} y2={y(v)} stroke="#e3e5e9" strokeWidth={1} />
                  <text x={34} y={y(v) + 4} textAnchor="end" fontSize={10} fill="#6f7782">
                    {v}%
                  </text>
                </g>
              ))}

              <g transform="translate(40,0)">
                {/* semanas de parada */}
                {pts.map((p, i) =>
                  paradas.has(p.semana) ? (
                    <rect
                      key={p.semana}
                      x={i * COL}
                      y={TOPO}
                      width={COL}
                      height={ALT}
                      fill="#fef3c7"
                      opacity={0.75}
                    >
                      <title>Obra parada: {paradas.get(p.semana)!.reason || "sem motivo informado"}</title>
                    </rect>
                  ) : null
                )}

                {/* hoje */}
                <line x1={xHoje} y1={TOPO} x2={xHoje} y2={TOPO + ALT} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" />
                <text x={xHoje + 3} y={TOPO + 11} fontSize={10} fill="#b45309">hoje</text>

                <path d={linha(pts.map((p) => p.previsto))} fill="none" stroke="#9aa3ad" strokeWidth={2} />
                {curva.temReplanejado && (
                  <path
                    d={linha(pts.map((p) => p.replanejado))}
                    fill="none" stroke="#d97706" strokeWidth={2} strokeDasharray="5 3"
                  />
                )}
                <path d={linha(pts.map((p) => p.realizado))} fill="none" stroke="#1f49a8" strokeWidth={2.5} />
                {pts.map((p, i) =>
                  p.realizado === null ? null : (
                    <circle key={p.semana} cx={x(i)} cy={y(p.realizado)} r={2.5} fill="#1f49a8">
                      <title>
                        {dataBR(p.semana)} — realizado {p.realizado.toLocaleString("pt-BR")}% · previsto{" "}
                        {p.previsto.toLocaleString("pt-BR")}%
                      </title>
                    </circle>
                  )
                )}

                {/* eixo x */}
                {pts.map((p, i) => (
                  <text
                    key={p.semana}
                    x={x(i)}
                    y={TOPO + ALT + 14}
                    textAnchor="middle"
                    fontSize={9}
                    fill={paradas.has(p.semana) ? "#b45309" : "#6f7782"}
                  >
                    {dataBR(p.semana)}
                  </text>
                ))}
              </g>
            </svg>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-ink-3">
        Cada etapa pesa a sua <strong>duração em dias úteis</strong> e se espalha por igual nas semanas
        em que acontece. No realizado, etapa concluída conta inteira na semana do <strong>fim real</strong>;
        etapa em andamento conta a fração do <strong>passo a passo</strong> já marcado. A linha do
        realizado para na semana de hoje.
      </p>
    </div>
  );
}

function Indicador({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <span className="rounded-xl bg-white px-3 py-1.5 shadow-card">
      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">{rotulo}</span>{" "}
      <strong className={`text-base ${cor}`}>{valor.toLocaleString("pt-BR")}%</strong>
    </span>
  );
}

function Chave({ cor, rotulo, tracejada }: { cor: string; rotulo: string; tracejada?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <svg width={18} height={6}>
        <line
          x1={0} y1={3} x2={18} y2={3}
          stroke={cor} strokeWidth={2}
          strokeDasharray={tracejada ? "4 3" : undefined}
        />
      </svg>
      {rotulo}
    </span>
  );
}
