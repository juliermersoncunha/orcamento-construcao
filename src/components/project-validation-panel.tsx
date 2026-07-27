"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Info } from "lucide-react";
import type { ValidationIssue } from "@/lib/calculations/project-validation";

type Props = {
  issues: ValidationIssue[];
};

const SEVERITY_CONFIG = {
  error:   { icon: XCircle,       color: "text-red-600",   bg: "bg-red-50",   border: "border-red-200",   label: "Corrigir" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Conferir" },
  info:    { icon: Info,          color: "text-blue-500",  bg: "bg-blue-50",  border: "border-blue-200",  label: "Informativo" },
};

const ORDER: ValidationIssue["severity"][] = ["error", "warning", "info"];

export function ProjectValidationPanel({ issues }: Props) {
  const [open, setOpen] = useState(false);

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const blocking = errors.length + warnings.length;

  const tone = errors.length > 0
    ? { border: "border-red-200",   bg: "bg-red-50",   text: "text-red-800",   sub: "text-red-700",   Icon: XCircle,       icon: "text-red-600" }
    : warnings.length > 0
    ? { border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-800", sub: "text-amber-700", Icon: AlertTriangle, icon: "text-amber-600" }
    : { border: "border-green-200", bg: "bg-green-50", text: "text-green-800", sub: "text-green-700", Icon: CheckCircle2,  icon: "text-green-600" };

  const summary = blocking > 0
    ? [
        errors.length > 0 ? `${errors.length} a corrigir` : null,
        warnings.length > 0 ? `${warnings.length} a conferir` : null,
      ].filter(Boolean).join(" · ")
    : issues.length > 0
    ? `Nenhuma pendência · ${issues.length} observação(ões)`
    : "Equipamentos, pontos e preços conferem";

  const sorted = [...issues].sort(
    (a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity)
  );

  return (
    <div className={`rounded-xl border ${tone.border} ${tone.bg} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <tone.Icon className={`w-5 h-5 shrink-0 ${tone.icon}`} />
          <div>
            <p className={`font-semibold text-sm ${tone.text}`}>
              Consistência do projeto — equipamentos, pontos e preços
            </p>
            <p className={`text-xs mt-0.5 ${tone.sub}`}>{summary}</p>
          </div>
        </div>
        {issues.length > 0 && (open
          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />)}
      </button>

      {open && issues.length > 0 && (
        <div className="border-t border-gray-200 bg-white">
          <div className="p-3 flex flex-col gap-2">
            {sorted.map((issue, idx) => {
              const cfg = SEVERITY_CONFIG[issue.severity];
              const Icon = cfg.icon;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${cfg.bg} ${cfg.border}`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-tight">
                      <span className="text-gray-500 font-normal">{issue.scope} · </span>
                      {issue.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{issue.detail}</p>
                  </div>
                  <span className={`text-xs font-medium shrink-0 mt-0.5 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
