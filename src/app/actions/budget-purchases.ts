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

// Marca ou desmarca linhas do orçamento como compradas. Cada linha é
// "fase:materialId", o mesmo id que a tela do orçamento usa.
export async function setBudgetPurchased(projectId: string, linhas: string[], comprado: boolean) {
  await assertOwnsProject(projectId);

  const chaves = linhas
    .map((l) => {
      const [phase, materialId] = l.split(":");
      return { phase, materialId };
    })
    .filter((k): k is { phase: PhaseType; materialId: string } =>
      !!k.materialId && (Object.values(PhaseType) as string[]).includes(k.phase)
    );
  if (chaves.length === 0) return;

  if (comprado) {
    await prisma.budgetPurchase.createMany({
      data: chaves.map((k) => ({ projectId, ...k })),
      skipDuplicates: true,
    });
  } else {
    await prisma.budgetPurchase.deleteMany({
      where: { projectId, OR: chaves },
    });
  }
  revalidatePath(`/projetos/${projectId}/orcamento`);
}
