import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { WizardContainer } from "./wizard-container";
import { ALL_PIPE_NAMES } from "@/lib/pipes-catalog";
import { ALL_ELECTRICAL_NAMES } from "@/lib/electrical-catalog";

export default async function WizardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ etapa?: string }>;
}) {
  const { id } = await params;
  const { etapa } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.userId },
    include: {
      rooms: {
        orderBy: { order: "asc" },
        include: {
          fixtures: true,
          joineries: true,
          accessories: true,
          imperm: true,
          wallFinishes: true,
        },
      },
      structure: true,
      roofing: true,
      installations: { include: { electricalPoints: true, hydraulicPoints: true } },
      finishes: { include: { roomFinishes: true } },
      walls: true,
    },
  });

  if (!project) redirect("/projetos");

  const currentStep = etapa ? parseInt(etapa) : Math.min(project.wizardStep, 8);

  // Materiais das listas fixas de entrada manual (tubos/conexões e
  // cabos/infraestrutura elétrica) — só os que existem no catálogo.
  const pipeMaterials = await prisma.material.findMany({
    where: { name: { in: [...ALL_PIPE_NAMES, ...ALL_ELECTRICAL_NAMES] }, active: true },
    select: { id: true, name: true, unit: true, currentPrice: true },
  });
  const pipesByName: Record<string, { id: string; name: string; unit: string; currentPrice: number }> = {};
  for (const m of pipeMaterials) pipesByName[m.name] = m;

  const manualRows = await prisma.manualBudgetItem.findMany({
    where: { projectId: id },
    select: { materialId: true, quantity: true },
  });
  const manualPipeQuantities: Record<string, number> = {};
  for (const r of manualRows) manualPipeQuantities[r.materialId] = r.quantity;

  return (
    <WizardContainer
      project={project}
      currentStep={currentStep}
      pipesByName={pipesByName}
      manualPipeQuantities={manualPipeQuantities}
    />
  );
}
