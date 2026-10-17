"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ISSUE_CATEGORIES, SERVICE_BY_KEY, SEVERITIES } from "@/lib/renovation-services";

async function assertOwnsProject(projectId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const p = await prisma.project.findFirst({
    where: { id: projectId, userId: session.userId },
    select: { id: true, wizardStep: true },
  });
  if (!p) redirect("/projetos");
  return p;
}

function touch(projectId: string) {
  revalidatePath(`/projetos/${projectId}/wizard`);
  revalidatePath(`/projetos/${projectId}/diagnostico`);
}

// O ambiente informado tem de ser deste projeto; vazio = geral.
async function ambienteDoProjeto(projectId: string, roomId: string | null | undefined) {
  if (!roomId) return null;
  const room = await prisma.room.findFirst({ where: { id: roomId, projectId }, select: { id: true } });
  return room?.id ?? null;
}

// ── Problemas da vistoria ───────────────────────────────────────────────────

export async function addRenovationIssue(
  projectId: string,
  input: { roomId: string | null; category: string; severity: string; description?: string }
) {
  await assertOwnsProject(projectId);
  if (!(ISSUE_CATEGORIES as readonly string[]).includes(input.category)) return { error: "Escolha o tipo de problema." };
  if (!SEVERITIES.some((s) => s.value === input.severity)) return { error: "Gravidade inválida." };

  const ultimo = await prisma.renovationIssue.findFirst({
    where: { projectId }, orderBy: { order: "desc" }, select: { order: true },
  });
  await prisma.renovationIssue.create({
    data: {
      projectId,
      roomId: await ambienteDoProjeto(projectId, input.roomId),
      category: input.category,
      severity: input.severity,
      description: input.description?.trim() || null,
      order: (ultimo?.order ?? -1) + 1,
    },
  });
  touch(projectId);
  return {};
}

export async function updateRenovationIssue(
  issueId: string,
  input: { category?: string; severity?: string; description?: string | null }
) {
  const issue = await donoDoProblema(issueId);
  const data: Record<string, unknown> = {};
  if (input.category !== undefined) {
    if (!(ISSUE_CATEGORIES as readonly string[]).includes(input.category)) return { error: "Tipo inválido." };
    data.category = input.category;
  }
  if (input.severity !== undefined) {
    if (!SEVERITIES.some((s) => s.value === input.severity)) return { error: "Gravidade inválida." };
    data.severity = input.severity;
  }
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  await prisma.renovationIssue.update({ where: { id: issueId }, data });
  touch(issue.projectId);
  return {};
}

// Excluir o problema não apaga os serviços dele: eles continuam no ambiente,
// sem vínculo — o serviço pode ainda ser necessário.
export async function deleteRenovationIssue(issueId: string) {
  const issue = await donoDoProblema(issueId);
  await prisma.renovationIssue.delete({ where: { id: issueId } });
  touch(issue.projectId);
  return {};
}

async function donoDoProblema(issueId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const issue = await prisma.renovationIssue.findFirst({
    where: { id: issueId, project: { userId: session.userId } },
    select: { id: true, projectId: true },
  });
  if (!issue) redirect("/projetos");
  return issue;
}

// ── Serviços ────────────────────────────────────────────────────────────────

export async function addRenovationService(
  projectId: string,
  input: { roomId: string | null; issueId: string | null; serviceKey: string; quantity: number; label?: string; notes?: string }
) {
  await assertOwnsProject(projectId);
  const def = SERVICE_BY_KEY.get(input.serviceKey);
  if (!def) return { error: "Escolha o serviço." };
  const q = Number(input.quantity);
  if (!Number.isFinite(q) || q <= 0) return { error: "Informe a quantidade." };
  if (input.serviceKey === "outro" && !input.label?.trim()) return { error: "Descreva o serviço." };

  let issueId: string | null = null;
  if (input.issueId) {
    const issue = await prisma.renovationIssue.findFirst({ where: { id: input.issueId, projectId }, select: { id: true } });
    issueId = issue?.id ?? null;
  }
  const ultimo = await prisma.renovationService.findFirst({
    where: { projectId }, orderBy: { order: "desc" }, select: { order: true },
  });
  await prisma.renovationService.create({
    data: {
      projectId,
      roomId: await ambienteDoProjeto(projectId, input.roomId),
      issueId,
      serviceKey: input.serviceKey,
      label: input.label?.trim() || null,
      quantity: q,
      notes: input.notes?.trim() || null,
      order: (ultimo?.order ?? -1) + 1,
    },
  });
  touch(projectId);
  return {};
}

export async function updateRenovationService(
  serviceId: string,
  input: { quantity?: number; label?: string | null; notes?: string | null; issueId?: string | null }
) {
  const svc = await donoDoServico(serviceId);
  const data: Record<string, unknown> = {};
  if (input.quantity !== undefined) {
    const q = Number(input.quantity);
    if (!Number.isFinite(q) || q <= 0) return { error: "Quantidade inválida." };
    data.quantity = q;
  }
  if (input.label !== undefined) data.label = input.label?.trim() || null;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.issueId !== undefined) {
    if (input.issueId) {
      const issue = await prisma.renovationIssue.findFirst({ where: { id: input.issueId, projectId: svc.projectId }, select: { id: true } });
      data.issueId = issue?.id ?? null;
    } else data.issueId = null;
  }
  await prisma.renovationService.update({ where: { id: serviceId }, data });
  touch(svc.projectId);
  return {};
}

export async function deleteRenovationService(serviceId: string) {
  const svc = await donoDoServico(serviceId);
  await prisma.renovationService.delete({ where: { id: serviceId } });
  touch(svc.projectId);
  return {};
}

async function donoDoServico(serviceId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const svc = await prisma.renovationService.findFirst({
    where: { id: serviceId, project: { userId: session.userId } },
    select: { id: true, projectId: true },
  });
  if (!svc) redirect("/projetos");
  return svc;
}

// Conclui a etapa de diagnóstico: libera a etapa Materiais (8) do wizard.
export async function finishRenovationDiagnosis(projectId: string) {
  const p = await assertOwnsProject(projectId);
  const n = await prisma.renovationService.count({ where: { projectId } });
  if (n === 0) return { error: "Lance ao menos um serviço antes de seguir." };
  await prisma.project.update({ where: { id: projectId }, data: { wizardStep: Math.max(p.wizardStep, 8) } });
  revalidatePath(`/projetos/${projectId}/wizard`);
  redirect(`/projetos/${projectId}/wizard?etapa=8`);
}
