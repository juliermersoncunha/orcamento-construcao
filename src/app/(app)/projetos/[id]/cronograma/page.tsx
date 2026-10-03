import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { CronogramaClient } from "./cronograma-client";

export default async function CronogramaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.userId },
    select: { id: true, name: true, clientName: true },
  });
  if (!project) redirect("/projetos");

  const stages = await prisma.scheduleStage.findMany({
    where: { projectId: id },
    orderBy: { order: "asc" },
    include: {
      tasks: { orderBy: { order: "asc" } },
      materials: {
        include: { material: { select: { id: true, name: true, unit: true, currentPrice: true } } },
      },
    },
  });

  // O seletor de material da etapa usa o catálogo ativo inteiro; a categoria
  // vai junto para a lista abrir já filtrada pelo que combina com a etapa.
  const materials = await prisma.material.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true, currentPrice: true, category: true },
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <Link href={`/projetos/${id}/orcamento`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-brand-600" />
          <h1 className="text-xl font-bold text-gray-900">Cronograma da Obra</h1>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-12">{project.name}</p>

      <CronogramaClient
        projectId={id}
        stages={stages.map((s) => ({
          id: s.id,
          order: s.order,
          name: s.name,
          deliverable: s.deliverable,
          dependsOn: s.dependsOn,
          days: s.days,
          startDate: s.startDate ? s.startDate.toISOString().slice(0, 10) : null,
          status: s.status,
          notes: s.notes,
          tasks: s.tasks.map((t) => ({ id: t.id, name: t.name, done: t.done })),
          materials: s.materials.map((m) => ({
            rowId: m.id,
            materialId: m.material.id,
            name: m.material.name,
            unit: m.material.unit,
            currentPrice: m.material.currentPrice,
            quantity: m.quantity,
          })),
        }))}
        materials={materials}
      />
    </div>
  );
}
