"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ProjectType } from "@/generated/prisma";

const CreateProjectSchema = z.object({
  name: z.string().min(2, { error: "Nome deve ter ao menos 2 caracteres." }).trim(),
  clientName: z.string().min(2, { error: "Nome do cliente obrigatório." }).trim(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  type: z.enum(["NOVA_CONSTRUCAO", "REFORMA", "AMPLIACAO"]),
  notes: z.string().optional(),
});

export type ProjectFormState = {
  errors?: Record<string, string[]>;
};

export async function createProject(
  _state: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const result = CreateProjectSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const project = await prisma.project.create({
    data: {
      ...result.data,
      type: result.data.type as ProjectType,
      userId: session.userId,
    },
  });

  redirect(`/projetos/${project.id}/wizard`);
}

export async function updateProjectStatus(
  projectId: string,
  status: "RASCUNHO" | "FINALIZADO" | "ENVIADO"
) {
  const session = await getSession();
  if (!session) redirect("/login");

  await prisma.project.update({
    where: { id: projectId, userId: session.userId },
    data: { status },
  });

  revalidatePath("/projetos");
}

export async function deleteProject(projectId: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  await prisma.project.delete({
    where: { id: projectId, userId: session.userId },
  });

  revalidatePath("/projetos");
}
