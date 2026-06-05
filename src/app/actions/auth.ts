"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

const LoginSchema = z.object({
  email: z.string().email({ error: "E-mail inválido." }).trim(),
  password: z.string().min(1, { error: "Informe a senha." }),
});

export type LoginState = {
  errors?: { email?: string[]; password?: string[]; general?: string[] };
};

export async function login(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const result = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return { errors: { general: ["E-mail ou senha incorretos."] } };
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return { errors: { general: ["E-mail ou senha incorretos."] } };
  }

  await createSession({ id: user.id, role: user.role, name: user.name });
  redirect("/projetos");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
