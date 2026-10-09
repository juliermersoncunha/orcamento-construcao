import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import { ConsumoClient } from "./consumo-client";
import { materiaisDaSemana, semanasPorEtapa, type PlanStage } from "@/lib/schedule-plan";

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

  const [usages, materials, stages, rooms, planejado, compras] = await Promise.all([
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
    // Estimado = o que as etapas do cronograma preveem consumir.
    prisma.scheduleStageMaterial.findMany({
      where: { stage: { projectId: id } },
      select: { materialId: true, quantity: true, material: { select: { name: true, unit: true } } },
    }),
    // Comprado = o que entrou na obra pela programação semanal.
    prisma.scheduleWeekPurchase.findMany({
      where: { projectId: id },
      select: { materialId: true, quantity: true, weekStart: true, material: { select: { name: true, unit: true } } },
    }),
  ]);

  // A quantidade comprada é a da linha da semana HOJE, não a do momento em
  // que foi marcada: quem corrige a linha comprada está corrigindo a compra.
  // Por isso as linhas são recalculadas aqui com a mesma função da tela de
  // Programação — revisão, volta ao calculado ou mudança no material da etapa
  // chegam ao estoque sem nenhuma sincronização à parte.
  const [etapasPlano, semanasEtapa, revisoes] = await Promise.all([
    prisma.scheduleStage.findMany({
      where: { projectId: id },
      select: {
        id: true, name: true, status: true, days: true,
        materials: { select: { materialId: true, quantity: true, material: { select: { name: true, unit: true } } } },
      },
    }),
    prisma.scheduleWeekStage.findMany({ where: { projectId: id }, select: { stageId: true, weekStart: true } }),
    prisma.scheduleWeekMaterial.findMany({
      where: { projectId: id },
      select: { weekStart: true, materialId: true, quantity: true, stageId: true, material: { select: { name: true, unit: true } } },
    }),
  ]);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const planStages: PlanStage[] = etapasPlano.map((s) => ({
    id: s.id, name: s.name, status: s.status, days: s.days, startDate: null,
    materials: s.materials.map((m) => ({ materialId: m.materialId, name: m.material.name, unit: m.material.unit, quantity: m.quantity })),
  }));
  const porEtapa = semanasPorEtapa(semanasEtapa.map((w) => ({ stageId: w.stageId, weekStart: iso(w.weekStart) })));
  const linhasDaSemana = new Map<string, Map<string, number>>();
  const qtdNaSemana = (semana: string, materialId: string): number | undefined => {
    if (!linhasDaSemana.has(semana)) {
      const ov = revisoes
        .filter((r) => iso(r.weekStart) === semana)
        .map((r) => ({ materialId: r.materialId, name: r.material.name, unit: r.material.unit, quantity: r.quantity, stageId: r.stageId }));
      linhasDaSemana.set(semana, new Map(materiaisDaSemana(semana, planStages, porEtapa, ov).map((l) => [l.materialId, l.quantity])));
    }
    return linhasDaSemana.get(semana)!.get(materialId);
  };

  // Quadro por material: estimado, comprado, consumido. A diferença entre eles
  // é o que esta tela existe para mostrar — sobra, desperdício, erro de
  // estimativa.
  const quadro = new Map<string, { materialId: string; name: string; unit: string; estimado: number; comprado: number; consumido: number }>();
  const linha = (materialId: string, name: string, unit: string) => {
    const l = quadro.get(materialId) ?? { materialId, name, unit, estimado: 0, comprado: 0, consumido: 0 };
    quadro.set(materialId, l);
    return l;
  };
  for (const r of planejado) linha(r.materialId, r.material.name, r.material.unit).estimado += r.quantity;
  for (const r of compras) {
    // Se a linha não existe mais na semana (etapa tirada, material excluído),
    // vale a quantidade gravada quando a compra foi marcada.
    const atual = qtdNaSemana(iso(r.weekStart), r.materialId);
    linha(r.materialId, r.material.name, r.material.unit).comprado += atual ?? r.quantity;
  }
  // Lançamento que voltou ao estoque fica no histórico, mas não é consumo.
  for (const u of usages) {
    if (u.status === "ESTOQUE") continue;
    linha(u.materialId, u.material.name, u.material.unit).consumido += u.quantity;
  }

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
          stageId: u.stageId,
          materialId: u.materialId,
          status: u.status,
          usedAt: u.usedAt.toISOString().slice(0, 10),
          automatico: u.autoStageId !== null,
          corrigido: u.autoStageId !== null && u.autoQuantity !== null && u.quantity !== u.autoQuantity,
        }))}
        quadro={[...quadro.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))}
      />
    </div>
  );
}
