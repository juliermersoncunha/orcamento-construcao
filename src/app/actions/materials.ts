"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { MaterialCategory } from "@/generated/prisma/index";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/projetos");
  return session;
}

const MaterialSchema = z.object({
  name: z.string().min(2, { error: "Nome obrigatório." }).trim(),
  unit: z.string().min(1, { error: "Unidade obrigatória." }).trim(),
  category: z.enum(["ESTRUTURA","ALVENARIA","COBERTURA","ELETRICA","HIDRAULICA","REVESTIMENTO","ESQUADRIA","OUTROS"]),
  currentPrice: z.coerce.number().min(0, { error: "Preço não pode ser negativo." }),
});

export type MaterialFormState = { errors?: Record<string, string[]> };

export async function createMaterial(
  _state: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  const session = await requireAdmin();
  const result = MaterialSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { errors: result.error.flatten().fieldErrors };

  const material = await prisma.material.create({
    data: { ...result.data, category: result.data.category as MaterialCategory },
  });

  await prisma.priceHistory.create({
    data: { materialId: material.id, price: result.data.currentPrice, changedBy: session.userId },
  });

  revalidatePath("/admin/materiais");
  return {};
}

export async function updateMaterialPrice(materialId: string, price: number) {
  const session = await requireAdmin();

  await prisma.material.update({
    where: { id: materialId },
    data: { currentPrice: price },
  });

  await prisma.priceHistory.create({
    data: { materialId, price, changedBy: session.userId },
  });

  revalidatePath("/admin/materiais");
}

export async function toggleMaterialActive(materialId: string, active: boolean) {
  await requireAdmin();
  await prisma.material.update({ where: { id: materialId }, data: { active } });
  revalidatePath("/admin/materiais");
}
