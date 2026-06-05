"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PhaseType } from "@/generated/prisma/index";

// Default distribution from the user's spreadsheet
const DEFAULT_DISTRIBUTION: Record<string, Record<number, number>> = {
  TERRAPLENAGEM:                { 1: 0.60, 2: 0.40 },
  FUNDACAO:                     { 1: 0.20, 2: 0.50, 3: 0.30 },
  ESTRUTURA_ALVENARIA:          { 2: 0.30, 3: 0.40, 4: 0.30 },
  LAJE:                         { 3: 0.50, 4: 0.50 },
  INSTALACOES_ELETRICAS:        { 3: 0.40, 4: 0.60 },
  INSTALACOES_HIDROSSANITARIAS: { 3: 0.40, 4: 0.60 },
  ESCADA:                       { 3: 1.00 },
  REVESTIMENTOS:                { 4: 0.50, 5: 0.50 },
  PINTURA:                      { 5: 0.60, 6: 0.40 },
  COBERTURA:                    { 2: 0.40, 3: 0.60 },
  ACABAMENTO:                   { 5: 0.40, 6: 0.60 },
  OUTROS:                       { 6: 1.00 },
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

export async function getCashFlow(projectId: string) {
  await authorizeProject(projectId);
  return prisma.cashFlowEntry.findMany({
    where: { projectId },
    orderBy: [{ phase: "asc" }, { month: "asc" }],
  });
}

export async function initDefaultCashFlow(projectId: string) {
  await authorizeProject(projectId);

  // Only init if no entries yet
  const existing = await prisma.cashFlowEntry.count({ where: { projectId } });
  if (existing > 0) return;

  const phases = await prisma.budgetItem.findMany({
    where: { projectId },
    select: { phase: true },
    distinct: ["phase"],
  });

  for (const { phase } of phases) {
    const dist = DEFAULT_DISTRIBUTION[phase] ?? { 1: 1.00 };
    for (const [month, percent] of Object.entries(dist)) {
      await prisma.cashFlowEntry.create({
        data: { projectId, phase, month: parseInt(month), percent },
      });
    }
  }

  revalidatePath(`/projetos/${projectId}/fluxo-caixa`);
}

export async function saveCashFlow(projectId: string, formData: FormData) {
  await authorizeProject(projectId);

  const phases = formData.getAll("phase") as string[];
  const months = formData.getAll("month") as string[];
  const percents = formData.getAll("percent") as string[];

  await prisma.cashFlowEntry.deleteMany({ where: { projectId } });

  for (let i = 0; i < phases.length; i++) {
    const percent = parseFloat(percents[i]);
    if (isNaN(percent) || percent <= 0) continue;
    await prisma.cashFlowEntry.create({
      data: {
        projectId,
        phase: phases[i] as PhaseType,
        month: parseInt(months[i]),
        percent,
      },
    });
  }

  revalidatePath(`/projetos/${projectId}/fluxo-caixa`);
}
