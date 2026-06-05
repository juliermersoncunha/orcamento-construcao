"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { LaborModel, PhaseType } from "@/generated/prisma/index";

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

async function authorizeProject(projectId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.userId },
  });
  if (!project) redirect("/projetos");
  return project;
}

export async function getLaborConfig(projectId: string) {
  await authorizeProject(projectId);
  return prisma.laborConfig.findUnique({
    where: { projectId },
    include: { phases: true },
  });
}

// Returns the list of phases present in the project's budget
export async function getProjectPhases(projectId: string) {
  await authorizeProject(projectId);
  const items = await prisma.budgetItem.findMany({
    where: { projectId },
    select: { phase: true },
    distinct: ["phase"],
  });
  return items.map((i) => ({ phase: i.phase, label: PHASE_LABELS[i.phase] ?? i.phase }));
}

export async function saveLaborConfig(projectId: string, formData: FormData) {
  await authorizeProject(projectId);

  const model = formData.get("model") as LaborModel;
  const phases = formData.getAll("phase") as string[];
  const values = formData.getAll("value") as string[];

  const config = await prisma.laborConfig.upsert({
    where: { projectId },
    create: { projectId, model },
    update: { model },
  });

  await prisma.laborPhase.deleteMany({ where: { laborConfigId: config.id } });

  for (let i = 0; i < phases.length; i++) {
    const value = parseFloat(values[i]);
    if (isNaN(value) || value <= 0) continue;
    await prisma.laborPhase.create({
      data: {
        laborConfigId: config.id,
        phase: phases[i] as PhaseType,
        value,
      },
    });
  }

  revalidatePath(`/projetos/${projectId}/mao-de-obra`);
  revalidatePath(`/projetos/${projectId}/orcamento`);
}

export async function deleteLaborConfig(projectId: string) {
  await authorizeProject(projectId);
  await prisma.laborConfig.deleteMany({ where: { projectId } });
  revalidatePath(`/projetos/${projectId}/mao-de-obra`);
  revalidatePath(`/projetos/${projectId}/orcamento`);
}
