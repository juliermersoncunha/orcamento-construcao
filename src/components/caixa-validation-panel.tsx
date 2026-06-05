"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ValidationResult } from "@/lib/caixa-validation";

type Props = {
  results: ValidationResult[];
  totalMat: number;
};

const STATUS_CONFIG = {
  ok:   { icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200", label: "Dentro da faixa" },
  low:  { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50",  border: "border-amber-200", label: "Abaixo do mínimo" },
  high: { icon: AlertTriangle, color: "text-orange-600",bg: "bg-orange-50", border: "border-orange-200",label: "Acima do máximo" },
  zero: { icon: XCircle,       color: "text-red-500",   bg: "bg-red-50",    border: "border-red-200",   label: "Não informado" },
  na:   { icon: Info,          color: "text-gray-400",  bg: "bg-gray-50",   border: "border-gray-100",  label: "Não aplicável" },
};

export function CaixaValidationPanel({ results, totalMat }: Props) {
  const [open, setOpen] = useState(false);

  const issues = results.filter((r) => r.status === "low" || r.status === "high" || r.status === "zero");
  const ok = results.filter((r) => r.status === "ok");
  const hasIssues = issues.length > 0;

  return (
    <div className={`rounded-xl border ${hasIssues ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"} overflow-hidden`}>
      {/* Header — sempre visível */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          {hasIssues ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          )}
          <div>
            <p className={`font-semibold text-sm ${hasIssues ? "text-amber-800" : "text-green-800"}`}>
              Validação de referência — faixas de mercado
            </p>
            <p className={`text-xs mt-0.5 ${hasIssues ? "text-amber-700" : "text-green-700"}`}>
              {hasIssues
                ? `${issues.length} item${issues.length > 1 ? "s" : ""} fora da faixa esperada · ${ok.length} dentro`
                : `Todos os ${ok.length} itens verificados estão dentro da faixa esperada`}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Detalhe expandível */}
      {open && (
        <div className="border-t border-gray-200 bg-white">
          <div className="p-3">
            <p className="text-xs text-gray-400 mb-3">
              Faixas de referência do mercado residencial (fonte: PLS). Valores calculados sobre o custo de materiais ({formatCurrency(totalMat)}).
            </p>
            <div className="flex flex-col gap-2">
              {results.map((r) => {
                const cfg = STATUS_CONFIG[r.status];
                const Icon = cfg.icon;
                return (
                  <div
                    key={r.item}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${cfg.bg} ${cfg.border}`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-tight">{r.label}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span>Faixa: {r.min.toFixed(1)}% – {r.max.toFixed(1)}%</span>
                        {r.value > 0 && (
                          <>
                            <span>·</span>
                            <span className={`font-medium ${cfg.color}`}>
                              Calculado: {r.percent.toFixed(1)}% ({formatCurrency(r.value)})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-medium shrink-0 mt-0.5 ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
