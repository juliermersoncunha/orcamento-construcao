"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Role } from "@/generated/prisma/index";

async function checkAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/projetos");
  return session;
}

// ── Criar usuário ─────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  name: z.string().min(2, { error: "Nome deve ter pelo menos 2 caracteres." }).trim(),
  email: z.string().email({ error: "E-mail inválido." }).trim().toLowerCase(),
  password: z.string().min(6, { error: "Senha deve ter pelo menos 6 caracteres." }),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export type UserFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
};

export async function createUser(
  _state: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await checkAdmin();

  const result = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { errors: result.error.flatten().fieldErrors };

  const exists = await prisma.user.findUnique({ where: { email: result.data.email } });
  if (exists) return { errors: { email: ["E-mail já cadastrado."] } };

  const hashed = await bcrypt.hash(result.data.password, 12);

  await prisma.user.create({
    data: {
      name: result.data.name,
      email: result.data.email,
      password: hashed,
      role: result.data.role as Role,
    },
  });

  revalidatePath("/admin/usuarios");
  return { success: true };
}

// ── Ativar / desativar ────────────────────────────────────────────────────────

export async function toggleUserActive(userId: string, active: boolean) {
  const me = await checkAdmin();
  if (userId === me.userId) return; // não se auto-desativa

  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/admin/usuarios");
}

// ── Alterar papel ─────────────────────────────────────────────────────────────

export async function changeUserRole(userId: string, role: Role) {
  const me = await checkAdmin();
  if (userId === me.userId) return; // não altera o próprio papel

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/usuarios");
}

// ── Resetar senha ─────────────────────────────────────────────────────────────

const ResetSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(6, { error: "Senha deve ter pelo menos 6 caracteres." }),
});

export type ResetPasswordState = {
  errors?: Record<string, string[]>;
  success?: boolean;
};

export async function resetUserPassword(
  _state: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  await checkAdmin();

  const result = ResetSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { errors: result.error.flatten().fieldErrors };

  const hashed = await bcrypt.hash(result.data.newPassword, 12);
  await prisma.user.update({
    where: { id: result.data.userId },
    data: { password: hashed },
  });

  revalidatePath("/admin/usuarios");
  return { success: true };
}
