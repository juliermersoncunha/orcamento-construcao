"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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

// O lancamento pertence ao projeto? Toda acao por linha passa por aqui, senao
// o id de um lancamento de outro projeto serviria para edita-lo.
async function assertOwnsUsage(usageId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const u = await prisma.materialUsage.findFirst({
    where: { id: usageId, project: { userId: session.userId } },
    select: { id: true, projectId: true },
  });
  if (!u) redirect("/projetos");
  return u;
}

function touch(projectId: string) {
  revalidatePath(`/projetos/${projectId}/consumo`);
}

export async function addMaterialUsage(
  projectId: string,
  input: {
    materialId: string;
    quantity: number;
    location?: string | null;
    stageId?: string | null;
    usedAt?: string | null;
    notes?: string | null;
  }
) {
  await assertOwnsProject(projectId);

  const qty = Number(input.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return { error: "Informe uma quantidade maior que zero." };

  const material = await prisma.material.findUnique({
    where: { id: input.materialId },
    select: { id: true },
  });
  if (!material) return { error: "Escolha um material." };

  // A etapa e opcional, mas se vier tem de ser deste projeto.
  // Etapa obrigatória: é ela que permite rastrear depois em que parte da obra
  // cada material foi consumido. A tela já exige; aqui é a garantia.
  if (!input.stageId) return { error: "Informe a etapa em que o material foi usado." };
  const stage = await prisma.scheduleStage.findFirst({
    where: { id: input.stageId, projectId },
    select: { id: true },
  });
  if (!stage) return { error: "Etapa não encontrada." };
  const stageId = stage.id;

  // Meio-dia evita a data voltar um dia ao cruzar fuso.
  const usedAt = input.usedAt ? new Date(`${input.usedAt}T12:00:00`) : new Date();

  // Cada saida de material e uma linha propria: duas retiradas do mesmo item no
  // mesmo dia sao dois fatos, e somar perderia o historico de consumo.
  await prisma.materialUsage.create({
    data: {
      projectId,
      materialId: input.materialId,
      stageId,
      quantity: qty,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      usedAt,
    },
  });

  touch(projectId);
  return {};
}

export async function updateMaterialUsage(
  usageId: string,
  input: {
    quantity?: number;
    location?: string | null;
    usedAt?: string | null;
    stageId?: string | null;
    materialId?: string;
    status?: string;
  }
) {
  const usage = await assertOwnsUsage(usageId);

  const data: Record<string, unknown> = {};
  if (input.status !== undefined) {
    if (input.status !== "CONSUMIDO" && input.status !== "ESTOQUE") return { error: "Situação inválida." };
    data.status = input.status;
  }
  if (input.materialId !== undefined) {
    const m = await prisma.material.findUnique({ where: { id: input.materialId }, select: { id: true } });
    if (!m) return { error: "Material não encontrado." };
    data.materialId = m.id;
  }
  if (input.quantity !== undefined) {
    const q = Number(input.quantity);
    if (!Number.isFinite(q) || q <= 0) return { error: "Quantidade inválida." };
    data.quantity = q;
  }
  if (input.location !== undefined) data.location = input.location?.trim() || null;
  if (input.usedAt !== undefined) {
    data.usedAt = input.usedAt ? new Date(`${input.usedAt}T12:00:00`) : new Date();
  }
  if (input.stageId !== undefined) {
    if (!input.stageId) return { error: "Informe a etapa em que o material foi usado." };
    const stage = await prisma.scheduleStage.findFirst({
      where: { id: input.stageId, projectId: usage.projectId },
      select: { id: true },
    });
    if (!stage) return { error: "Etapa não encontrada." };
    data.stageId = stage.id;
  }

  await prisma.materialUsage.update({ where: { id: usageId }, data });
  touch(usage.projectId);
  return {};
}

export async function deleteMaterialUsage(usageId: string) {
  const usage = await assertOwnsUsage(usageId);
  await prisma.materialUsage.delete({ where: { id: usageId } });
  touch(usage.projectId);
  return {};
}
