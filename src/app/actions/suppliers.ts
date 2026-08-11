"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/projetos");
  return session;
}

function clean(v: FormDataEntryValue | null): string | null {
  const s = (v as string | null)?.trim();
  return s ? s : null;
}

export type SupplierFormState = { error?: string; ok?: boolean };

export async function createSupplier(
  _state: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  await requireAdmin();

  const name = clean(formData.get("name"));
  if (!name || name.length < 2) return { error: "Nome do fornecedor é obrigatório." };

  const existing = await prisma.supplier.findUnique({ where: { name } });
  if (existing) return { error: `"${name}" já está cadastrado.` };

  await prisma.supplier.create({
    data: { name, phone: clean(formData.get("phone")), notes: clean(formData.get("notes")) },
  });

  revalidatePath("/admin/fornecedores");
  revalidatePath("/admin/materiais");
  return { ok: true };
}

export async function updateSupplier(
  supplierId: string,
  input: { name: string; phone: string | null; notes: string | null }
) {
  await requireAdmin();

  const name = input.name.trim();
  if (name.length < 2) return { error: "Nome do fornecedor é obrigatório." };

  // O nome é único — avisa em vez de estourar erro de constraint.
  const clash = await prisma.supplier.findFirst({
    where: { name, NOT: { id: supplierId } },
    select: { id: true },
  });
  if (clash) return { error: `"${name}" já está cadastrado em outro fornecedor.` };

  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  revalidatePath("/admin/fornecedores");
  revalidatePath("/admin/materiais");
  return {};
}

export async function toggleSupplierActive(supplierId: string, active: boolean) {
  await requireAdmin();
  await prisma.supplier.update({ where: { id: supplierId }, data: { active } });
  revalidatePath("/admin/fornecedores");
  revalidatePath("/admin/materiais");
}

export async function deleteSupplier(supplierId: string) {
  await requireAdmin();

  // A FK é ON DELETE SET NULL, então os materiais sobrevivem — mas o vínculo
  // some silenciosamente. Melhor avisar e deixar o usuário decidir.
  const linked = await prisma.material.count({ where: { supplierId } });
  if (linked > 0) {
    return {
      error: `${linked} material(is) usam este fornecedor. Troque o fornecedor deles ou desative-o em vez de excluir.`,
    };
  }

  await prisma.supplier.delete({ where: { id: supplierId } });

  revalidatePath("/admin/fornecedores");
  revalidatePath("/admin/materiais");
  return {};
}
