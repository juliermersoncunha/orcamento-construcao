import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { ViabilidadeForm } from "./viabilidade-form";
import { montarResumoCustos } from "@/lib/cost-summary";

export default async function ViabilidadePage({
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
      laborLines: { select: { role: true, label: true, value: true } },
      costLines: { where: { kind: "GESTAO" } },
      indirectCosts: true,
      viability: true,
    },
  });
  if (!project) redirect("/projetos");

  const floorArea = project.rooms.reduce((sum, r) => sum + r.width * r.length, 0);

  const totalMaterials = project.budgetItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceSnapshot,
    0
  );

  // Mão de obra por função e gestão da obra, no mesmo cálculo do orçamento.
  const resumo = montarResumoCustos(totalMaterials, project.laborLines, project.costLines);
  const bdiGestao = resumo.gestao.find((g) => g.percent)?.percent ?? null;

  const totalIndirect = project.indirectCosts.reduce((sum, c) => sum + c.value, 0);
  const v = project.viability;

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/projetos/${id}/custos-indiretos`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-600" />
          <h1 className="text-xl font-bold text-gray-900">Viabilidade Financeira</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Análise de resultado</CardTitle>
        </CardHeader>
        <CardContent>
          <ViabilidadeForm
            projectId={id}
            totalMaterials={totalMaterials}
            totalLabor={resumo.totalMO}
            totalGestao={resumo.totalGestao}
            bdiGestao={bdiGestao}
            totalIndirect={totalIndirect}
            floorArea={floorArea}
            // persistido
            salePrice={v?.salePrice ?? 0}
            bdiPercent={v?.bdiPercent ?? 0}
            notes={v?.notes ?? null}
            landValue={v?.landValue ?? 0}
            landAppraisalValue={v?.landAppraisalValue ?? 0}
            itivPercent={v?.itivPercent ?? 2}
            landDocPercent={v?.landDocPercent ?? 3.65}
            hasSale={v?.hasSale ?? false}
            venalValue={v?.venalValue ?? 0}
            saleDocPercent={v?.saleDocPercent ?? 7.5}
            brokeragePercent={v?.brokeragePercent ?? 5}
            irPercent={v?.irPercent ?? 15}
          />
        </CardContent>
      </Card>
    </div>
  );
}
