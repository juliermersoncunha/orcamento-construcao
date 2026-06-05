import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp } from "lucide-react";
import Link from "next/link";
import { initDefaultCashFlow } from "@/app/actions/cashFlow";
import { FluxoCaixaTable } from "./fluxo-caixa-table";
import { formatCurrency } from "@/lib/utils";
import { LaborModel } from "@/generated/prisma";
import { getCaixaCurves } from "@/lib/caixa-curves";

const PHASE_LABELS: Record<string, string> = {
  TERRAPLENAGEM: "Terraplenagem",
  FUNDACAO: "Fundação",
  ESTRUTURA_ALVENARIA: "Estrutura e Alvenaria",
  LAJE: "Laje",
  INSTALACOES_ELETRICAS: "Inst. Elétricas",
  INSTALACOES_HIDROSSANITARIAS: "Inst. Hidrossanitárias",
  ESCADA: "Escada",
  REVESTIMENTOS: "Revestimentos",
  PINTURA: "Pintura",
  COBERTURA: "Cobertura",
  ACABAMENTO: "Acabamento",
  OUTROS: "Outros",
};

function computeMOForPhase(
  model: LaborModel,
  laborPhaseValue: number,
  phaseMat: number,
  totalFloorArea: number
): number {
  if (model === "FIXED") return laborPhaseValue;
  if (model === "PER_M2") return laborPhaseValue * totalFloorArea;
  if (model === "PERCENT") return phaseMat * (laborPhaseValue / 100);
  return 0;
}

export default async function FluxoCaixaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.userId },
    include: {
      rooms: { select: { width: true, length: true } },
      budgetItems: { select: { phase: true, quantity: true, unitPriceSnapshot: true } },
      laborConfig: { include: { phases: true } },
    },
  });
  if (!project) redirect("/projetos");
  if (project.budgetItems.length === 0) redirect(`/projetos/${id}/wizard?etapa=8`);

  // Initialize default cash flow if needed
  await initDefaultCashFlow(id);

  const entries = await prisma.cashFlowEntry.findMany({
    where: { projectId: id },
    orderBy: [{ phase: "asc" }, { month: "asc" }],
  });

  // Phase material totals
  const phaseMat = new Map<string, number>();
  for (const item of project.budgetItems) {
    phaseMat.set(item.phase, (phaseMat.get(item.phase) ?? 0) + item.quantity * item.unitPriceSnapshot);
  }

  // Phase MO totals
  const totalFloorArea = project.rooms.reduce((sum, r) => sum + r.width * r.length, 0);
  const phaseMO = new Map<string, number>();
  if (project.laborConfig) {
    for (const lp of project.laborConfig.phases) {
      phaseMO.set(lp.phase, computeMOForPhase(
        project.laborConfig.model,
        lp.value,
        phaseMat.get(lp.phase) ?? 0,
        totalFloorArea
      ));
    }
  }

  // Phase total (mat + MO)
  const phaseTotal = new Map<string, number>();
  for (const phase of phaseMat.keys()) {
    phaseTotal.set(phase, (phaseMat.get(phase) ?? 0) + (phaseMO.get(phase) ?? 0));
  }

  // Determine months range
  const allMonths = entries.map((e) => e.month);
  const maxMonth = allMonths.length > 0 ? Math.max(...allMonths) : 6;
  const months = Array.from({ length: maxMonth }, (_, i) => i + 1);

  // Build cash flow matrix: phase → month → value (R$)
  const phases = Array.from(new Set(entries.map((e) => e.phase)));
  type CashRow = { phase: string; byMonth: Record<number, number>; total: number };
  const rows: CashRow[] = phases.map((phase) => {
    const phaseEntries = entries.filter((e) => e.phase === phase);
    const total = phaseTotal.get(phase) ?? 0;
    const byMonth: Record<number, number> = {};
    for (const entry of phaseEntries) {
      byMonth[entry.month] = total * entry.percent;
    }
    return { phase, byMonth, total };
  });

  // Monthly totals
  const monthlyTotals = months.map((m) => rows.reduce((sum, row) => sum + (row.byMonth[m] ?? 0), 0));
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  // Accumulated
  let accumulated = 0;
  const accumByMonth = monthlyTotals.map((t) => (accumulated += t));

  // Curvas de referência Caixa
  const caixaCurves = getCaixaCurves(maxMonth);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/projetos/${id}/orcamento`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          <h1 className="text-xl font-bold text-gray-900">Fluxo de Caixa</h1>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Distribuição mensal do custo total (materiais + mão de obra) por etapa.
        Total geral: <strong>{formatCurrency(grandTotal)}</strong>
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Distribuição Mensal</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <FluxoCaixaTable
            projectId={id}
            rows={rows.map((r) => ({
              phase: r.phase,
              label: PHASE_LABELS[r.phase] ?? r.phase,
              byMonth: r.byMonth,
              total: r.total,
            }))}
            months={months}
            monthlyTotals={monthlyTotals}
            accumByMonth={accumByMonth}
            grandTotal={grandTotal}
            entries={entries.map((e) => ({ phase: e.phase, month: e.month, percent: e.percent }))}
            caixaCurves={caixaCurves}
          />
        </CardContent>
      </Card>
    </div>
  );
}
