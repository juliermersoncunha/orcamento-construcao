"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SCHEDULE_TEMPLATE } from "@/lib/schedule-template";

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

// A etapa pertence ao projeto? Toda acao por etapa passa por aqui, senao o id
// de uma etapa de outro projeto serviria para edita-la.
async function assertOwnsStage(stageId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const stage = await prisma.scheduleStage.findFirst({
    where: { id: stageId, project: { userId: session.userId } },
    select: { id: true, projectId: true },
  });
  if (!stage) redirect("/projetos");
  return stage;
}

function touch(projectId: string) {
  revalidatePath(`/projetos/${projectId}/cronograma`);
}

// Data de inicio da obra — ancora a visao por semana.
export async function setScheduleStart(projectId: string, date: string | null) {
  await assertOwnsProject(projectId);
  await prisma.project.update({
    where: { id: projectId },
    // Meio-dia evita a data voltar um dia ao cruzar fuso.
    data: { scheduleStart: date ? new Date(`${date}T12:00:00`) : null },
  });
  touch(projectId);
  return {};
}

// Prazo de entrega da obra.
export async function setScheduleEnd(projectId: string, date: string | null) {
  await assertOwnsProject(projectId);
  await prisma.project.update({
    where: { id: projectId },
    data: { scheduleEnd: date ? new Date(`${date}T12:00:00`) : null },
  });
  touch(projectId);
  return {};
}

// ── Etapas ─────────────────────────────────────────────────────────────────

// Carrega o modelo sugerido. Só funciona com o cronograma vazio — nunca
// sobrescreve etapas que o usuário já montou.
export async function applyScheduleTemplate(projectId: string) {
  await assertOwnsProject(projectId);

  const existing = await prisma.scheduleStage.count({ where: { projectId } });
  if (existing > 0) return { error: "O cronograma já tem etapas. Exclua-as antes de aplicar o modelo." };

  // Uma etapa por vez porque cada uma precisa do proprio id para as sub-etapas.
  for (const [i, t] of SCHEDULE_TEMPLATE.entries()) {
    await prisma.scheduleStage.create({
      data: {
        projectId,
        order: i,
        name: t.name,
        deliverable: t.deliverable,
        dependsOn: t.dependsOn,
        days: t.days,
        tasks: { create: t.tasks.map((name, j) => ({ order: j, name })) },
      },
    });
  }

  touch(projectId);
  return {};
}

// Preenche o passo a passo das etapas que ja existem — util para quem aplicou
// o modelo antes das sub-etapas existirem. Casa pelo nome e so mexe em etapa
// que ainda nao tem item nenhum, entao nunca sobrescreve o que o usuario
// escreveu e pode rodar quantas vezes quiser.
export async function fillTemplateTasks(projectId: string) {
  await assertOwnsProject(projectId);

  const stages = await prisma.scheduleStage.findMany({
    where: { projectId },
    select: { id: true, name: true, _count: { select: { tasks: true } } },
  });

  let preenchidas = 0;
  for (const stage of stages) {
    if (stage._count.tasks > 0) continue;
    const t = SCHEDULE_TEMPLATE.find(
      (x) => x.name.toLowerCase() === stage.name.trim().toLowerCase()
    );
    if (!t) continue;
    await prisma.scheduleTask.createMany({
      data: t.tasks.map((name, j) => ({ stageId: stage.id, order: j, name })),
    });
    preenchidas++;
  }

  touch(projectId);
  if (preenchidas === 0) {
    return { error: "Nenhuma etapa vazia do modelo foi encontrada para preencher." };
  }
  return {};
}

export async function addScheduleStage(projectId: string, name: string) {
  await assertOwnsProject(projectId);

  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Informe o nome da etapa." };

  const last = await prisma.scheduleStage.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.scheduleStage.create({
    data: { projectId, name: trimmed, order: (last?.order ?? -1) + 1 },
  });

  touch(projectId);
  return {};
}

export async function updateScheduleStage(
  stageId: string,
  input: {
    name?: string;
    deliverable?: string | null;
    dependsOn?: string | null;
    days?: number;
    startDate?: string | null;
    status?: string;
    notes?: string | null;
  }
) {
  const stage = await assertOwnsStage(stageId);

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const n = input.name.trim();
    if (n.length < 2) return { error: "Nome da etapa obrigatório." };
    data.name = n;
  }
  if (input.deliverable !== undefined) data.deliverable = input.deliverable?.trim() || null;
  if (input.dependsOn !== undefined) data.dependsOn = input.dependsOn?.trim() || null;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.days !== undefined) {
    const d = Number(input.days);
    if (!Number.isFinite(d) || d < 0) return { error: "Duração inválida." };
    data.days = d;
  }
  if (input.status !== undefined) data.status = input.status;
  // Meio-dia evita a data voltar um dia ao cruzar fuso.
  if (input.startDate !== undefined) {
    data.startDate = input.startDate ? new Date(`${input.startDate}T12:00:00`) : null;
  }

  await prisma.scheduleStage.update({ where: { id: stageId }, data });
  touch(stage.projectId);
  return {};
}

export async function deleteScheduleStage(stageId: string) {
  const stage = await assertOwnsStage(stageId);
  await prisma.scheduleStage.delete({ where: { id: stageId } });

  // Reescreve a ordem para não deixar buracos na sequência.
  const rest = await prisma.scheduleStage.findMany({
    where: { projectId: stage.projectId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    rest.map((s, i) => prisma.scheduleStage.update({ where: { id: s.id }, data: { order: i } }))
  );

  touch(stage.projectId);
  return {};
}

// Troca a etapa de lugar com a vizinha. Reordenar por par mantém a sequência
// sempre contígua, sem precisar renumerar tudo a cada clique.
export async function moveScheduleStage(stageId: string, direction: "up" | "down") {
  const stage = await assertOwnsStage(stageId);

  const all = await prisma.scheduleStage.findMany({
    where: { projectId: stage.projectId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const i = all.findIndex((s) => s.id === stageId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return {};

  await prisma.$transaction([
    prisma.scheduleStage.update({ where: { id: all[i].id }, data: { order: all[j].order } }),
    prisma.scheduleStage.update({ where: { id: all[j].id }, data: { order: all[i].order } }),
  ]);

  touch(stage.projectId);
  return {};
}

// ── Materiais da etapa ─────────────────────────────────────────────────────

export async function addStageMaterial(
  stageId: string,
  input: { materialId: string; quantity: number }
) {
  const stage = await assertOwnsStage(stageId);

  const qty = Number(input.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return { error: "Quantidade inválida." };

  const material = await prisma.material.findUnique({
    where: { id: input.materialId },
    select: { id: true },
  });
  if (!material) return { error: "Material não encontrado." };

  // Lançar o mesmo material duas vezes soma, em vez de duplicar a linha.
  await prisma.scheduleStageMaterial.upsert({
    where: { stageId_materialId: { stageId, materialId: input.materialId } },
    create: { stageId, materialId: input.materialId, quantity: qty },
    update: { quantity: { increment: qty } },
  });

  touch(stage.projectId);
  return {};
}

export async function updateStageMaterial(rowId: string, quantity: number) {
  const session = await getSession();
  if (!session) redirect("/login");

  const row = await prisma.scheduleStageMaterial.findFirst({
    where: { id: rowId, stage: { project: { userId: session.userId } } },
    select: { id: true, stage: { select: { projectId: true } } },
  });
  if (!row) redirect("/projetos");

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 0) return { error: "Quantidade inválida." };

  if (qty === 0) {
    await prisma.scheduleStageMaterial.delete({ where: { id: rowId } });
  } else {
    await prisma.scheduleStageMaterial.update({ where: { id: rowId }, data: { quantity: qty } });
  }

  touch(row.stage.projectId);
  return {};
}

export async function toggleStageMaterialPurchased(rowId: string, purchased: boolean) {
  const session = await getSession();
  if (!session) redirect("/login");

  const row = await prisma.scheduleStageMaterial.findFirst({
    where: { id: rowId, stage: { project: { userId: session.userId } } },
    select: { id: true, stage: { select: { projectId: true } } },
  });
  if (!row) redirect("/projetos");

  await prisma.scheduleStageMaterial.update({ where: { id: rowId }, data: { purchased } });
  touch(row.stage.projectId);
  return {};
}

export async function removeStageMaterial(rowId: string) {
  return updateStageMaterial(rowId, 0);
}

// ── Sub-etapas (passo a passo) ─────────────────────────────────────────────

async function assertOwnsTask(taskId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const task = await prisma.scheduleTask.findFirst({
    where: { id: taskId, stage: { project: { userId: session.userId } } },
    select: { id: true, stage: { select: { projectId: true } } },
  });
  if (!task) redirect("/projetos");
  return task;
}

export async function addScheduleTask(stageId: string, name: string) {
  const stage = await assertOwnsStage(stageId);

  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Informe o nome do item." };

  const last = await prisma.scheduleTask.findFirst({
    where: { stageId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.scheduleTask.create({
    data: { stageId, name: trimmed, order: (last?.order ?? -1) + 1 },
  });

  touch(stage.projectId);
  return {};
}

export async function toggleScheduleTask(taskId: string, done: boolean) {
  const task = await assertOwnsTask(taskId);
  await prisma.scheduleTask.update({ where: { id: taskId }, data: { done } });
  touch(task.stage.projectId);
  return {};
}

export async function renameScheduleTask(taskId: string, name: string) {
  const task = await assertOwnsTask(taskId);
  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Nome do item obrigatório." };
  await prisma.scheduleTask.update({ where: { id: taskId }, data: { name: trimmed } });
  touch(task.stage.projectId);
  return {};
}

export async function deleteScheduleTask(taskId: string) {
  const task = await assertOwnsTask(taskId);
  await prisma.scheduleTask.delete({ where: { id: taskId } });
  touch(task.stage.projectId);
  return {};
}
