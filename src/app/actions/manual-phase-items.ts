"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { PhaseType } from "@prisma/client";

async function assertOwnsProject(projectId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const p = await prisma.project.findFirst({
    where: { id: projectId, userId: session.userId },
    select: { id: true },
  });
  if (!p) redirect("/projetos");
  return p;
}

// Adiciona (ou soma a) um material avulso numa fase escolhida pelo usuário.
// A unicidade é por (projeto, material) — então trocar a fase de um material
// que já existe apenas move a linha, em vez de duplicá-la.
export async function addManualPhaseItem(
  projectId: string,
  input: { materialId: string; quantity: number; phase: string }
) {
  await assertOwnsProject(projectId);

  const qty = Number(input.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return { error: "Quantidade inválida." };
  if (!input.materialId) return { error: "Escolha um material." };

  const material = await prisma.material.findUnique({
    where: { id: input.materialId },
    select: { id: true },
  });
  if (!material) return { error: "Material não encontrado." };

  await prisma.manualBudgetItem.upsert({
    where: { projectId_materialId: { projectId, materialId: input.materialId } },
    create: {
      projectId,
      materialId: input.materialId,
      quantity: qty,
      phase: input.phase as PhaseType,
    },
    update: { quantity: qty, phase: input.phase as PhaseType },
  });

  revalidatePath(`/projetos/${projectId}/wizard`);
  return {};
}

export async function removeManualPhaseItem(projectId: string, materialId: string) {
  await assertOwnsProject(projectId);
  await prisma.manualBudgetItem.deleteMany({ where: { projectId, materialId } });
  revalidatePath(`/projetos/${projectId}/wizard`);
  return {};
}

// Edita quantidade e/ou fase de um item ja lancado. Trocar a fase move a linha
// de uma secao para outra, sem apagar e re-adicionar.
export async function updateManualPhaseItem(
  projectId: string,
  materialId: string,
  input: { quantity?: number; phase?: string }
) {
  await assertOwnsProject(projectId);
  const data: Record<string, unknown> = {};
  if (input.quantity !== undefined) {
    const q = Number(input.quantity);
    if (!Number.isFinite(q) || q <= 0) return { error: "Quantidade inválida." };
    data.quantity = q;
  }
  if (input.phase !== undefined) {
    if (!input.phase) return { error: "Escolha a fase." };
    data.phase = input.phase as PhaseType;
  }
  const existe = await prisma.manualBudgetItem.findUnique({
    where: { projectId_materialId: { projectId, materialId } },
    select: { id: true },
  });
  if (!existe) return { error: "Item não encontrado." };
  await prisma.manualBudgetItem.update({
    where: { projectId_materialId: { projectId, materialId } },
    data,
  });
  revalidatePath(`/projetos/${projectId}/wizard`);
  return {};
}
