"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { MaterialCategory } from "@prisma/client";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/projetos");
  return session;
}

// Must stay in sync with CATEGORIES in material-form.tsx and the MaterialCategory enum.
const MaterialSchema = z.object({
  name: z.string().min(2, { error: "Nome obrigatório." }).trim(),
  unit: z.string().min(1, { error: "Unidade obrigatória." }).trim(),
  category: z.enum([
    "TERRAPLENAGEM","FUNDACAO","ESTRUTURA","ALVENARIA","LAJE","COBERTURA",
    "ELETRICA","HIDRAULICA","REVESTIMENTO","PINTURA","ESQUADRIA","ACABAMENTO","OUTROS",
  ]),
  currentPrice: z.coerce.number().min(0, { error: "Preço não pode ser negativo." }),
  priceDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(`${v}T12:00:00`) : null)),
  // Quantidade da embalagem e marca são opcionais — o catálogo antigo não tem.
  quantity: z
    .string()
    .trim()
    .optional()
    .transform((v) => {
      if (!v) return null;
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  brand: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  supplierId: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
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

export async function updateMaterial(
  materialId: string,
  input: {
    name: string;
    price: number;
    priceDate: string | null;
    quantity?: number | null;
    brand?: string | null;
    supplierId?: string | null;
  }
) {
  const session = await requireAdmin();

  const name = input.name.trim();
  if (name.length < 2) return { error: "Nome obrigatório." };
  if (!Number.isFinite(input.price) || input.price < 0) {
    return { error: "Preço inválido." };
  }

  const current = await prisma.material.findUnique({ where: { id: materialId } });
  if (!current) return { error: "Material não encontrado." };

  // Noon avoids the date shifting a day back when stored/read across timezones.
  const priceDate = input.priceDate ? new Date(`${input.priceDate}T12:00:00`) : null;

  await prisma.material.update({
    where: { id: materialId },
    data: {
      name,
      currentPrice: input.price,
      priceDate,
      quantity:
        input.quantity == null || !Number.isFinite(input.quantity) || input.quantity <= 0
          ? null
          : input.quantity,
      brand: input.brand?.trim() || null,
      supplierId: input.supplierId || null,
    },
  });

  // Only log history when the price actually changed.
  if (current.currentPrice !== input.price) {
    await prisma.priceHistory.create({
      data: { materialId, price: input.price, changedBy: session.userId },
    });
  }

  revalidatePath("/admin/materiais");
  return {};
}

export async function toggleMaterialActive(materialId: string, active: boolean) {
  await requireAdmin();
  await prisma.material.update({ where: { id: materialId }, data: { active } });
  revalidatePath("/admin/materiais");
}

export async function deleteMaterial(materialId: string) {
  await requireAdmin();

  const usedInBudget = await prisma.budgetItem.count({ where: { materialId } });
  if (usedInBudget > 0) {
    return { error: `Material usado em ${usedInBudget} item(ns) de orçamento. Desative-o em vez de excluir.` };
  }

  await prisma.priceHistory.deleteMany({ where: { materialId } });
  await prisma.material.delete({ where: { id: materialId } });

  revalidatePath("/admin/materiais");
  return {};
}
