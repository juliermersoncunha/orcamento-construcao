"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function updatePremise(id: string, value: number) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/projetos");

  await prisma.globalPremise.update({
    where: { id },
    data: { value },
  });

  revalidatePath("/admin/premissas");
}

export async function updateAllPremises(updates: Array<{ id: string; value: number }>) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/projetos");

  await prisma.$transaction(
    updates.map(({ id, value }) =>
      prisma.globalPremise.update({ where: { id }, data: { value } })
    )
  );

  revalidatePath("/admin/premissas");
}
