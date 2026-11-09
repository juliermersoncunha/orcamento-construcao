"use client";

// Paradas da obra: períodos em que nada anda. Registrar uma parada empurra as
// semanas programadas dali em diante; a linha de base congelada fica onde
// estava, e é a comparação entre as duas que mostra o custo da parada.

import { useState } from "react";
import { PauseCircle, Plus, Trash2 } from "lucide-react";
import { addSchedulePause, deleteSchedulePause } from "@/app/actions/schedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { diasUteisDaPausa, periodoBR, type Pausa } from "@/lib/schedule-pauses";

type Run = (fn: () => Promise<{ error?: string } | void>) => void;

export function Paradas({
  projectId, pausas, isPending, run,
}: {
  projectId: string;
  pausas: Pausa[];
  isPending: boolean;
  run: Run;
}) {
  const [aberto, setAberto] = useState(false);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [motivo, setMotivo] = useState("");

  const totalSemanas = pausas.reduce((s, p) => s + p.weeksShifted, 0);
  const totalDias = pausas.reduce((s, p) => s + diasUteisDaPausa(p.startDate, p.endDate), 0);

  function registrar() {
    run(async () => {
      const r = await addSchedulePause(projectId, { startDate: inicio, endDate: fim, reason: motivo });
      if (r?.error) return r;
      setInicio(""); setFim(""); setMotivo(""); setAberto(false);
    });
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-3">
          <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <h3 className="text-sm font-semibold text-ink">Paradas da obra</h3>
          <span className="text-xs text-ink-3">
            {pausas.length === 0
              ? "nenhuma registrada"
              : `${pausas.length} ${pausas.length === 1 ? "parada" : "paradas"} · ${totalSemanas} ${totalSemanas === 1 ? "semana" : "semanas"} · ${totalDias} dias úteis perdidos`}
          </span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setAberto((v) => !v)} disabled={isPending}>
            <Plus className="w-4 h-4" />
            Registrar parada
          </Button>
        </div>

        {pausas.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {pausas.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-amber-50 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-amber-900">{periodoBR(p.startDate, p.endDate)}</span>
                <span className="text-amber-800">{p.reason || "sem motivo informado"}</span>
                <span className="text-xs text-amber-700">
                  empurrou {p.weeksShifted} {p.weeksShifted === 1 ? "semana" : "semanas"} ·{" "}
                  {diasUteisDaPausa(p.startDate, p.endDate)} dias úteis
                </span>
                <div className="flex-1" />
                <button
                  type="button"
                  disabled={isPending}
                  title={`Remover: devolve ${p.weeksShifted} ${p.weeksShifted === 1 ? "semana" : "semanas"} às etapas programadas depois dela`}
                  aria-label="Remover parada"
                  onClick={() => {
                    if (!confirm(`Remover esta parada?\n\nAs etapas programadas depois dela voltam ${p.weeksShifted} ${p.weeksShifted === 1 ? "semana" : "semanas"}, e o fim previsto também.`)) return;
                    run(() => deleteSchedulePause(p.id));
                  }}
                  className="text-amber-700 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {aberto && (
          <div className="mt-3 flex flex-col gap-3 rounded-xl bg-surface p-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-ink-2">
                Início da parada
                <input
                  type="date"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  className="rounded-xl border-[1.5px] border-line bg-white px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-ink-2">
                Volta a trabalhar em
                <input
                  type="date"
                  value={fim}
                  onChange={(e) => setFim(e.target.value)}
                  className="rounded-xl border-[1.5px] border-line bg-white px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-medium text-ink-2">
                Motivo
                <input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="ex.: pedreiro saiu para uma reforma"
                  className="rounded-xl border-[1.5px] border-line bg-white px-2 py-1.5 text-sm"
                />
              </label>
              <Button onClick={registrar} disabled={isPending || !inicio || !fim}>
                Registrar
              </Button>
            </div>
            <p className="text-xs text-ink-3">
              A parada conta por semanas inteiras, que é como a obra é programada. Tudo que estiver
              marcado da semana da parada em diante anda para a frente, junto com o fim previsto. A
              linha de base congelada não se mexe — é contra ela que o cronograma mostra o atraso.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
