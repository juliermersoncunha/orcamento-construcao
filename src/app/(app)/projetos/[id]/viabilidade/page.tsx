import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { ViabilidadeForm } from "./viabilidade-form";
import { LaborModel } from "@/generated/prisma/index";

function computeMO(model: LaborModel, value: number, phaseMat: number, area: number): number {
  if (model === "FIXED") return value;
  if (model === "PER_M2") return value * area;
  if (model === "PERCENT") return phaseMat * (value / 100);
  return 0;
}

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
      laborConfig: { include: { phases: true } },
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

  const phaseMat = new Map<string, number>();
  for (const item of project.budgetItems) {
    phaseMat.set(item.phase, (phaseMat.get(item.phase) ?? 0) + item.quantity * item.unitPriceSnapshot);
  }

  let totalLabor = 0;
  if (project.laborConfig) {
    for (const lp of project.laborConfig.phases) {
      totalLabor += computeMO(
        project.laborConfig.model,
        lp.value,
        phaseMat.get(lp.phase) ?? 0,
        floorArea
      );
    }
  }

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
            totalLabor={totalLabor}
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
