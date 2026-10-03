import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import { ConsumoClient } from "./consumo-client";

export default async function ConsumoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.userId },
    select: { id: true, name: true },
  });
  if (!project) redirect("/projetos");

  const [usages, materials, stages, rooms] = await Promise.all([
    prisma.materialUsage.findMany({
      where: { projectId: id },
      orderBy: [{ usedAt: "desc" }, { createdAt: "desc" }],
      include: {
        material: { select: { id: true, name: true, unit: true } },
        stage: { select: { id: true, name: true } },
      },
    }),
    prisma.material.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    prisma.scheduleStage.findMany({
      where: { projectId: id },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    // Os ambientes viram sugestão no campo "onde": quem lança material pensa em
    // "Banheiro Suíte", não num id.
    prisma.room.findMany({
      where: { projectId: id },
      orderBy: { order: "asc" },
      select: { name: true },
    }),
  ]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <Link href={`/projetos/${id}/orcamento`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-brand-600" />
          <h1 className="text-xl font-bold text-gray-900">Consumo de Material</h1>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-12">{project.name}</p>

      <ConsumoClient
        projectId={id}
        materials={materials}
        stages={stages}
        locationSuggestions={[
          ...stages.map((s) => s.name),
          ...rooms.map((r) => r.name),
        ]}
        usages={usages.map((u) => ({
          id: u.id,
          materialName: u.material.name,
          unit: u.material.unit,
          quantity: u.quantity,
          location: u.location,
          stageName: u.stage?.name ?? null,
          usedAt: u.usedAt.toISOString().slice(0, 10),
        }))}
      />
    </div>
  );
}
