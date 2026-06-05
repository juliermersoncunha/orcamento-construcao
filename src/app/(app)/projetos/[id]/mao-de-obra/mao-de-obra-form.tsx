"use client";

import { useTransition, useState } from "react";
import { saveLaborConfig } from "@/app/actions/laborConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Check, Info } from "lucide-react";
import Link from "next/link";

const PHASE_LABELS: Record<string, string> = {
  TERRAPLENAGEM: "Terraplenagem",
  FUNDACAO: "Fundação",
  ESTRUTURA_ALVENARIA: "Estrutura e Alvenaria",
  LAJE: "Laje",
  INSTALACOES_ELETRICAS: "Instalações Elétricas",
  INSTALACOES_HIDROSSANITARIAS: "Instalações Hidrossanitárias",
  ESCADA: "Escada",
  REVESTIMENTOS: "Revestimentos",
  PINTURA: "Pintura",
  COBERTURA: "Cobertura",
  ACABAMENTO: "Acabamento",
  OUTROS: "Outros",
};

type LaborPhase = { phase: string; value: number };
type LaborConfig = { model: string; phases: LaborPhase[] } | null;

type Props = {
  projectId: string;
  phaseTotals: Record<string, number>;
  totalFloorArea: number;
  laborConfig: LaborConfig;
};

function computeMO(
  model: string,
  values: Record<string, number>,
  phaseTotals: Record<string, number>,
  totalFloorArea: number,
  phase: string
): number {
  const v = values[phase] ?? 0;
  if (v <= 0) return 0;
  if (model === "FIXED") return v;
  if (model === "PER_M2") return v * totalFloorArea;
  if (model === "PERCENT") return (phaseTotals[phase] ?? 0) * (v / 100);
  return 0;
}

export function MaoDeObraForm({ projectId, phaseTotals, totalFloorArea, laborConfig }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [model, setModel] = useState<string>(laborConfig?.model ?? "PERCENT");

  const initialValues: Record<string, number> = {};
  if (laborConfig) {
    for (const p of laborConfig.phases) {
      initialValues[p.phase] = p.value;
    }
  }
  const [values, setValues] = useState<Record<string, number>>(initialValues);

  const phases = Object.keys(phaseTotals);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("model", model);
    for (const phase of phases) {
      fd.append("phase", phase);
      fd.append("value", String(values[phase] ?? 0));
    }
    startTransition(async () => {
      await saveLaborConfig(projectId, fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  const modelLabel =
    model === "FIXED" ? "R$ fixo por etapa"
    : model === "PER_M2" ? `R$/m² × ${totalFloorArea.toFixed(1)} m²`
    : "% do custo de materiais";

  const totalMO = phases.reduce((sum, phase) => sum + computeMO(model, values, phaseTotals, totalFloorArea, phase), 0);
  const totalMat = phases.reduce((sum, phase) => sum + (phaseTotals[phase] ?? 0), 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Model selector */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Modelo de cálculo</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "FIXED", label: "Valor fixo (R$)" },
            { value: "PER_M2", label: "Por m² (R$/m²)" },
            { value: "PERCENT", label: "Percentual (%)" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setModel(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                model === opt.value
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-amber-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <Info className="w-3 h-3" /> {modelLabel}
        </p>
      </div>

      {/* Phase table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left font-medium text-gray-500 py-2">Etapa</th>
              <th className="text-right font-medium text-gray-500 py-2 w-36">Mat. (R$)</th>
              <th className="text-right font-medium text-gray-500 py-2 w-32">
                {model === "FIXED" ? "Valor (R$)" : model === "PER_M2" ? "R$/m²" : "%"}
              </th>
              <th className="text-right font-medium text-gray-500 py-2 w-32">MO (R$)</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase) => {
              const mo = computeMO(model, values, phaseTotals, totalFloorArea, phase);
              return (
                <tr key={phase} className="border-b border-gray-50">
                  <td className="py-2 pr-4 text-gray-800">{PHASE_LABELS[phase] ?? phase}</td>
                  <td className="py-2 px-2 text-right text-gray-500">
                    {formatCurrency(phaseTotals[phase] ?? 0)}
                  </td>
                  <td className="py-2 pl-2">
                    <input type="hidden" name="phase" value={phase} />
                    <input
                      type="number"
                      name="value"
                      min="0"
                      step="0.01"
                      value={values[phase] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [phase]: parseFloat(e.target.value) || 0 }))
                      }
                      className="w-full text-right rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-2 pl-2 text-right font-semibold text-amber-700">
                    {mo > 0 ? formatCurrency(mo) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td className="py-3 font-bold text-gray-900">Total</td>
              <td className="py-3 text-right font-bold text-gray-900">{formatCurrency(totalMat)}</td>
              <td></td>
              <td className="py-3 text-right font-bold text-amber-700">{formatCurrency(totalMO)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="pt-1 text-xs text-gray-400">Total Geral (mat. + MO)</td>
              <td colSpan={2} className="pt-1 text-right font-bold text-gray-900">
                {formatCurrency(totalMat + totalMO)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link href={`/projetos/${projectId}/orcamento`}>
          <Button type="button" variant="outline">Ver orçamento</Button>
        </Link>
        <Button type="submit" disabled={isPending}>
          {saved ? (
            <>
              <Check className="w-4 h-4" /> Salvo!
            </>
          ) : isPending ? (
            "Salvando..."
          ) : (
            "Salvar Mão de Obra"
          )}
        </Button>
      </div>
    </form>
  );
}
