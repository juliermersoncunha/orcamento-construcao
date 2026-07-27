"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

// { materialId: quantity } — quantidade 0 (ou negativa) apaga a linha,
// para não poluir o painel de "sem preço" com itens que o usuário zerou.
export type ManualPipesPayload = Record<string, number>;

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

export async function saveManualPipes(projectId: string, payload: ManualPipesPayload) {
  await assertOwnsProject(projectId);

  const entries = Object.entries(payload);

  await prisma.$transaction(async (tx) => {
    for (const [materialId, qty] of entries) {
      const q = Number(qty);
      if (!Number.isFinite(q) || q <= 0) {
        await tx.manualBudgetItem.deleteMany({ where: { projectId, materialId } });
        continue;
      }
      await tx.manualBudgetItem.upsert({
        where: { projectId_materialId: { projectId, materialId } },
        create: { projectId, materialId, quantity: q },
        update: { quantity: q },
      });
    }
  });

  revalidatePath(`/projetos/${projectId}/wizard`);
}
