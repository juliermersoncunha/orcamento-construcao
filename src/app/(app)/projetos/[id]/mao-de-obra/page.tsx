import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HardHat } from "lucide-react";
import Link from "next/link";
import { MaoDeObraForm } from "./mao-de-obra-form";

export default async function MaoDeObraPage({
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
    },
  });
  if (!project) redirect("/projetos");

  const budgetPhases = await prisma.budgetItem.findMany({
    where: { projectId: id },
    select: { phase: true, quantity: true, unitPriceSnapshot: true },
  });

  if (budgetPhases.length === 0) redirect(`/projetos/${id}/wizard?etapa=7`);

  // Aggregate phase totals (materials)
  const phaseTotals = new Map<string, number>();
  for (const item of budgetPhases) {
    phaseTotals.set(item.phase, (phaseTotals.get(item.phase) ?? 0) + item.quantity * item.unitPriceSnapshot);
  }

  const laborConfig = await prisma.laborConfig.findUnique({
    where: { projectId: id },
    include: { phases: true },
  });

  const totalFloorArea = project.rooms.reduce((sum, r) => sum + r.width * r.length, 0);

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/projetos/${id}/orcamento`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <HardHat className="w-5 h-5 text-amber-600" />
          <h1 className="text-xl font-bold text-gray-900">Mão de Obra</h1>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Configure o custo de mão de obra para cada etapa do orçamento.
        Área total da obra: <strong>{totalFloorArea.toFixed(1)} m²</strong>
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração de Mão de Obra</CardTitle>
          <CardDescription>
            Escolha o modelo e defina os valores por etapa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaoDeObraForm
            projectId={id}
            phaseTotals={Object.fromEntries(phaseTotals)}
            totalFloorArea={totalFloorArea}
            laborConfig={
              laborConfig
                ? {
                    model: laborConfig.model,
                    phases: laborConfig.phases.map((p) => ({
                      phase: p.phase,
                      value: p.value,
                    })),
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
