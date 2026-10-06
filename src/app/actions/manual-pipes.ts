"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
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

// `block` so vem quando a tela mandou itens adicionados a mao: e ele que diz a
// qual dos dois blocos o item pertence, ja que a categoria do material nao
// responde mais por isso.
export async function saveManualPipes(
  projectId: string,
  payload: ManualPipesPayload,
  block?: string,
  addedIds: string[] = []
) {
  await assertOwnsProject(projectId);

  const entries = Object.entries(payload);
  const added = new Set(addedIds);

  // Uma query por material estourava o limite de 5s da transacao interativa
  // assim que o catalogo cresceu: sao ~60 idas ao banco por bloco, e contra um
  // banco remoto isso passa de 5s facil. Vira duas queries — uma que apaga os
  // zerados e uma que grava todo o resto de uma vez.
  const zerados: string[] = [];
  const gravar: { id: string; materialId: string; quantity: number; block: string | null }[] = [];

  for (const [materialId, qty] of entries) {
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      zerados.push(materialId);
      continue;
    }
    gravar.push({
      id: randomUUID(),
      materialId,
      quantity: q,
      block: block && added.has(materialId) ? block : null,
    });
  }

  await prisma.$transaction(async (tx) => {
    if (zerados.length > 0) {
      await tx.manualBudgetItem.deleteMany({
        where: { projectId, materialId: { in: zerados } },
      });
    }

    if (gravar.length > 0) {
      // COALESCE no block para que regravar um bloco nao apague a marca de um
      // item que foi adicionado a mao numa sessao anterior.
      await tx.$executeRaw`
        INSERT INTO "ManualBudgetItem" ("id", "projectId", "materialId", "quantity", "block")
        VALUES ${Prisma.join(
          gravar.map(
            (r) => Prisma.sql`(${r.id}, ${projectId}, ${r.materialId}, ${r.quantity}, ${r.block})`
          )
        )}
        ON CONFLICT ("projectId", "materialId") DO UPDATE
          SET "quantity" = EXCLUDED."quantity",
              "block" = COALESCE(EXCLUDED."block", "ManualBudgetItem"."block")
      `;
    }
  });

  revalidatePath(`/projetos/${projectId}/wizard`);
}
