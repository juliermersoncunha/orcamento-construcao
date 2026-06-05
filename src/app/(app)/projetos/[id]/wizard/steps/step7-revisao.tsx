"use client";

import { useTransition } from "react";
import { calculateAndSaveBudget } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Calculator, AlertCircle } from "lucide-react";
import Link from "next/link";

export function Step7Revisao({ project }: { project: any }) {
  const [isPending, startTransition] = useTransition();

  const hasRooms = project.rooms.length > 0;
  const totalArea = project.rooms.reduce(
    (sum: number, r: any) => sum + r.width * r.length,
    0
  );

  const checks = [
    { label: "Ambientes cadastrados", ok: hasRooms, detail: hasRooms ? `${project.rooms.length} cômodo(s) — ${totalArea.toFixed(2)} m²` : "Nenhum cômodo informado" },
    { label: "Estrutura definida", ok: !!project.structure, detail: project.structure ? `${project.structure.blockType} / ${project.structure.floors} pavimento(s)` : "Não configurado" },
    { label: "Cobertura definida", ok: !!project.roofing, detail: project.roofing ? `${project.roofing.roofType} — ${project.roofing.tileType}` : "Não configurado" },
    { label: "Instalações configuradas", ok: !!project.installations, detail: project.installations ? "Pontos elétricos e hidráulicos definidos" : "Não configurado" },
    { label: "Revestimentos definidos", ok: !!project.finishes, detail: project.finishes ? `${project.finishes.doors + project.finishes.externalDoors} porta(s), ${project.finishes.windows} janela(s)` : "Não configurado" },
  ];

  const allOk = checks.every((c) => c.ok);

  function handleCalculate() {
    startTransition(() => calculateAndSaveBudget(project.id));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-amber-700" />
          </div>
          <CardTitle>Etapa 8 — Revisão e Geração do Orçamento</CardTitle>
        </div>
        <CardDescription>Verifique os dados e gere o levantamento de materiais.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 mb-8">
          {checks.map(({ label, ok, detail }) => (
            <div
              key={label}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
            >
              {ok ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
              </div>
              {!ok && (
                <Link
                  href={`/projetos/${project.id}/wizard?etapa=${checks.indexOf(checks.find((c) => c.label === label)!) + 2}`}
                  className="ml-auto text-xs text-amber-700 font-medium hover:underline"
                >
                  Preencher
                </Link>
              )}
            </div>
          ))}
        </div>

        {!allOk && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
            Preencha todos os campos marcados antes de gerar o orçamento.
          </p>
        )}

        <div className="flex justify-center">
          <Button
            onClick={handleCalculate}
            disabled={!allOk || isPending}
            size="lg"
            className="gap-2"
          >
            <Calculator className="w-5 h-5" />
            {isPending ? "Calculando..." : "Gerar Levantamento e Orçamento"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
