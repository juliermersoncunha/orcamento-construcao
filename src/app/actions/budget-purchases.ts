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

// Cada linha da tela do orçamento é "fase:materialId".
function chavesDe(linhas: string[]) {
  return linhas
    .map((l) => {
      const [phase, materialId] = l.split(":");
      return { phase, materialId };
    })
    .filter((k): k is { phase: PhaseType; materialId: string } =>
      !!k.materialId && (Object.values(PhaseType) as string[]).includes(k.phase)
    );
}

// Marca ou desmarca linhas do orçamento como compradas por inteiro. Marcar
// por inteiro também apaga uma compra parcial que existia.
export async function setBudgetPurchased(projectId: string, linhas: string[], comprado: boolean) {
  await assertOwnsProject(projectId);

  const chaves = chavesDe(linhas);
  if (chaves.length === 0) return;

  if (comprado) {
    await prisma.$transaction(
      chaves.map((k) =>
        prisma.budgetPurchase.upsert({
          where: { projectId_phase_materialId: { projectId, ...k } },
          create: { projectId, ...k },
          update: { quantity: null },
        })
      )
    );
  } else {
    await prisma.budgetPurchase.deleteMany({
      where: { projectId, OR: chaves },
    });
  }
  revalidatePath(`/projetos/${projectId}/orcamento`);
}

// Compra parcial: guarda quanto já foi comprado de uma linha. Zero ou vazio
// volta a linha para "a comprar".
export async function setBudgetPurchaseQuantity(projectId: string, linha: string, quantidade: number) {
  await assertOwnsProject(projectId);

  const [chave] = chavesDe([linha]);
  if (!chave) return { error: "Linha inválida." };
  if (!Number.isFinite(quantidade) || quantidade < 0) return { error: "Quantidade inválida." };

  if (quantidade === 0) {
    await prisma.budgetPurchase.deleteMany({ where: { projectId, ...chave } });
  } else {
    await prisma.budgetPurchase.upsert({
      where: { projectId_phase_materialId: { projectId, ...chave } },
      create: { projectId, ...chave, quantity: quantidade },
      update: { quantity: quantidade },
    });
  }
  revalidatePath(`/projetos/${projectId}/orcamento`);
}
