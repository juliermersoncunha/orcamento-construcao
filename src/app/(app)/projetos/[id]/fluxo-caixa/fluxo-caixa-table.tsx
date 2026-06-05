"use client";

import { useTransition, useState } from "react";
import { saveCashFlow } from "@/app/actions/cashFlow";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Check, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import type { CaixaCurves } from "@/lib/caixa-curves";

type Row = {
  phase: string;
  label: string;
  byMonth: Record<number, number>;
  total: number;
};

type Entry = { phase: string; month: number; percent: number };

type Props = {
  projectId: string;
  rows: Row[];
  months: number[];
  monthlyTotals: number[];
  accumByMonth: number[];
  grandTotal: number;
  entries: Entry[];
  caixaCurves: CaixaCurves[];
};

export function FluxoCaixaTable({
  projectId,
  rows,
  months,
  grandTotal,
  entries: initialEntries,
  caixaCurves,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [showCurves, setShowCurves] = useState(true);

  const initialPercs: Record<string, number> = {};
  for (const e of initialEntries) {
    initialPercs[`${e.phase}-${e.month}`] = e.percent * 100;
  }
  const [percs, setPercs] = useState<Record<string, number>>(initialPercs);
  const [maxMonth, setMaxMonth] = useState(months.length || 6);
  const allMonths = Array.from({ length: maxMonth }, (_, i) => i + 1);

  function getPercent(phase: string, month: number) {
    return percs[`${phase}-${month}`] ?? 0;
  }

  function setPercent(phase: string, month: number, val: number) {
    setPercs((prev) => ({ ...prev, [`${phase}-${month}`]: val }));
  }

  function phaseMonthlyValue(row: Row, month: number) {
    return row.total * (getPercent(row.phase, month) / 100);
  }

  function phaseTotal(row: Row) {
    return allMonths.reduce((sum, m) => sum + phaseMonthlyValue(row, m), 0);
  }

  function monthTotal(month: number) {
    return rows.reduce((sum, row) => sum + phaseMonthlyValue(row, month), 0);
  }

  let acc = 0;
  const accumCalc = allMonths.map((m) => (acc += monthTotal(m)));
  // % acumulado executado por mês
  const accumPct = accumCalc.map((v) => (grandTotal > 0 ? (v / grandTotal) * 100 : 0));

  // Curvas interpoladas para o número de meses atual
  function getCurveForMonth(month: number) {
    return caixaCurves.find((c) => c.month === month) ?? null;
  }

  function curveStatus(executedPct: number, curve: CaixaCurves | null): "lenta" | "normal" | "rapida" | null {
    if (!curve || executedPct === 0) return null;
    if (executedPct < curve.lenta) return "lenta";
    if (executedPct <= curve.normal) return "normal";
    return "rapida";
  }

  function handleSubmit() {
    const fd = new FormData();
    for (const row of rows) {
      for (const month of allMonths) {
        const pct = getPercent(row.phase, month);
        if (pct > 0) {
          fd.append("phase", row.phase);
          fd.append("month", String(month));
          fd.append("percent", String(pct / 100));
        }
      }
    }
    startTransition(async () => {
      await saveCashFlow(projectId, fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 justify-between">
        <button
          type="button"
          onClick={() => setShowCurves((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
        >
          {showCurves ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showCurves ? "Ocultar curvas de referência" : "Mostrar curvas de referência"}
        </button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setMaxMonth((m) => m + 1)}>
            <Plus className="w-3 h-3 mr-1" /> Mês
          </Button>
          {maxMonth > 1 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setMaxMonth((m) => Math.max(1, m - 1))}>
              <Trash2 className="w-3 h-3 mr-1" /> Remover mês
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left font-medium text-gray-500 py-2 pr-3">Etapa</th>
              <th className="text-right font-medium text-gray-500 py-2 w-24">Total (R$)</th>
              {allMonths.map((m) => (
                <th key={m} className="text-center font-medium text-gray-500 py-2 w-20">
                  Mês {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowTotal = phaseTotal(row);
              const pctSum = allMonths.reduce((s, m) => s + getPercent(row.phase, m), 0);
              const over = pctSum > 100.01;
              return (
                <tr key={row.phase} className="border-b border-gray-50">
                  <td className="py-1.5 pr-3 text-gray-800 whitespace-nowrap">{row.label}</td>
                  <td className="py-1.5 text-right text-gray-600 pr-2">
                    <span className={over ? "text-red-500 font-bold" : ""}>
                      {formatCurrency(rowTotal)}{over && " ⚠"}
                    </span>
                  </td>
                  {allMonths.map((m) => {
                    const pct = getPercent(row.phase, m);
                    const val = (row.total * pct) / 100;
                    return (
                      <td key={m} className="py-1 px-1">
                        <div className="flex flex-col items-center gap-0.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={pct || ""}
                            onChange={(e) => setPercent(row.phase, m, parseFloat(e.target.value) || 0)}
                            className="w-full text-center rounded border border-gray-200 px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                            placeholder="%"
                          />
                          {val > 0 && (
                            <span className="text-amber-700 font-medium">{formatCurrency(val)}</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="py-2 font-bold text-gray-900 pr-3">Total mês (R$)</td>
              <td className="py-2 text-right font-bold text-gray-900 pr-2">
                {formatCurrency(grandTotal)}
              </td>
              {allMonths.map((m) => (
                <td key={m} className="py-2 text-center font-bold text-amber-700">
                  {formatCurrency(monthTotal(m))}
                </td>
              ))}
            </tr>

            {/* Acumulado executado */}
            <tr className="bg-amber-50">
              <td className="py-1.5 text-xs text-gray-600 pr-3 font-medium">Acumulado (R$)</td>
              <td></td>
              {allMonths.map((m, i) => (
                <td key={m} className="py-1.5 text-center text-xs font-medium text-amber-800">
                  {formatCurrency(accumCalc[i])}
                </td>
              ))}
            </tr>

            {/* Acumulado % */}
            <tr className="bg-amber-50/60">
              <td className="py-1 text-xs text-gray-500 pr-3">Acumulado (%)</td>
              <td></td>
              {allMonths.map((m, i) => (
                <td key={m} className="py-1 text-center text-xs text-amber-700">
                  {accumPct[i].toFixed(1)}%
                </td>
              ))}
            </tr>

            {/* Curvas de referência */}
            {showCurves && caixaCurves.length > 0 && (
              <>
                <tr className="border-t border-gray-100">
                  <td colSpan={allMonths.length + 2} className="pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Curvas de referência de mercado (% acumulado)
                  </td>
                </tr>
                {/* Lenta */}
                <tr className="bg-red-50/40">
                  <td className="py-1 text-xs text-red-500 pr-3 font-medium">Curva Lenta</td>
                  <td></td>
                  {allMonths.map((m) => {
                    const curve = getCurveForMonth(m);
                    return (
                      <td key={m} className="py-1 text-center text-xs text-red-400">
                        {curve ? `${curve.lenta}%` : "—"}
                      </td>
                    );
                  })}
                </tr>
                {/* Normal */}
                <tr className="bg-green-50/40">
                  <td className="py-1 text-xs text-green-600 pr-3 font-medium">Curva Normal</td>
                  <td></td>
                  {allMonths.map((m) => {
                    const curve = getCurveForMonth(m);
                    return (
                      <td key={m} className="py-1 text-center text-xs text-green-600 font-medium">
                        {curve ? `${curve.normal}%` : "—"}
                      </td>
                    );
                  })}
                </tr>
                {/* Rápida */}
                <tr className="bg-blue-50/40">
                  <td className="py-1 text-xs text-blue-500 pr-3 font-medium">Curva Rápida</td>
                  <td></td>
                  {allMonths.map((m) => {
                    const curve = getCurveForMonth(m);
                    return (
                      <td key={m} className="py-1 text-center text-xs text-blue-400">
                        {curve ? `${curve.rapida}%` : "—"}
                      </td>
                    );
                  })}
                </tr>
                {/* Situação da obra */}
                <tr className="border-t border-gray-100">
                  <td className="py-1.5 text-xs text-gray-600 pr-3 font-medium">Situação prevista</td>
                  <td></td>
                  {allMonths.map((m, i) => {
                    const curve = getCurveForMonth(m);
                    const status = curveStatus(accumPct[i], curve);
                    if (!status) return <td key={m} />;
                    const cfg =
                      status === "lenta"
                        ? { label: "Lenta", cls: "bg-red-100 text-red-600" }
                        : status === "normal"
                        ? { label: "Normal", cls: "bg-green-100 text-green-700" }
                        : { label: "Rápida", cls: "bg-blue-100 text-blue-700" };
                    return (
                      <td key={m} className="py-1 text-center">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </>
            )}
          </tfoot>
        </table>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {saved ? (
            <><Check className="w-4 h-4" /> Salvo!</>
          ) : isPending ? "Salvando..." : "Salvar Fluxo de Caixa"}
        </Button>
      </div>
    </div>
  );
}
