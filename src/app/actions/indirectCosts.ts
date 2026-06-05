"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

async function checkAccess(projectId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: session.userId } });
  if (!project) redirect("/projetos");
  return session;
}

export async function addIndirectCost(projectId: string, formData: FormData) {
  await checkAccess(projectId);

  await prisma.indirectCost.create({
    data: {
      projectId,
      label: formData.get("label") as string,
      category: formData.get("category") as string,
      value: parseFloat(formData.get("value") as string) || 0,
    },
  });

  revalidatePath(`/projetos/${projectId}/custos-indiretos`);
  revalidatePath(`/projetos/${projectId}/viabilidade`);
}

export async function deleteIndirectCost(projectId: string, id: string) {
  await checkAccess(projectId);

  await prisma.indirectCost.delete({ where: { id } });

  revalidatePath(`/projetos/${projectId}/custos-indiretos`);
  revalidatePath(`/projetos/${projectId}/viabilidade`);
}

export async function saveViability(projectId: string, formData: FormData) {
  await checkAccess(projectId);

  const f = (key: string) => parseFloat(formData.get(key) as string) || 0;

  const data = {
    salePrice:          f("salePrice"),
    bdiPercent:         f("bdiPercent"),
    notes:              (formData.get("notes") as string) || null,
    // terreno
    landValue:          f("landValue"),
    landAppraisalValue: f("landAppraisalValue"),
    itivPercent:        f("itivPercent") || 2,
    landDocPercent:     f("landDocPercent") || 3.65,
    // venda
    hasSale:            formData.get("hasSale") === "true",
    venalValue:         f("venalValue"),
    saleDocPercent:     f("saleDocPercent") || 7.5,
    brokeragePercent:   f("brokeragePercent") || 5,
    irPercent:          f("irPercent") || 15,
  };

  await prisma.projectViability.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });

  revalidatePath(`/projetos/${projectId}/viabilidade`);
}
