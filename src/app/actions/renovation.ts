"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ISSUE_CATEGORIES, SERVICE_BY_KEY, medidaSugerida } from "@/lib/renovation-services";

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
  input: { roomId: string | null; category: string; description?: string }
) {
  await assertOwnsProject(projectId);
  if (!(ISSUE_CATEGORIES as readonly string[]).includes(input.category)) return { error: "Escolha o tipo de problema." };

  const ultimo = await prisma.renovationIssue.findFirst({
    where: { projectId }, orderBy: { order: "desc" }, select: { order: true },
  });
  await prisma.renovationIssue.create({
    data: {
      projectId,
      roomId: await ambienteDoProjeto(projectId, input.roomId),
      category: input.category,
      description: input.description?.trim() || null,
      order: (ultimo?.order ?? -1) + 1,
    },
  });
  touch(projectId);
  return {};
}

export async function updateRenovationIssue(
  issueId: string,
  input: { category?: string; description?: string | null }
) {
  const issue = await donoDoProblema(issueId);
  const data: Record<string, unknown> = {};
  if (input.category !== undefined) {
    if (!(ISSUE_CATEGORIES as readonly string[]).includes(input.category)) return { error: "Tipo inválido." };
    data.category = input.category;
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
  if (def.descricaoLivre && !input.label?.trim()) return { error: "Descreva o serviço." };

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

// Mesmo serviço em vários ambientes de uma vez (ex.: piso na casa toda). Cada
// ambiente recebe a sua medida sugerida (com desconto de vãos); serviço sem
// medida usa a quantidade informada. Ambiente que já tem o serviço é pulado.
export async function addRenovationServiceBatch(
  projectId: string,
  input: { serviceKey: string; roomIds: string[]; quantity?: number; label?: string }
): Promise<{ error?: string; criados?: number; pulados?: string[]; semMedida?: string[] }> {
  await assertOwnsProject(projectId);
  const def = SERVICE_BY_KEY.get(input.serviceKey);
  if (!def) return { error: "Escolha o serviço." };
  const label = input.label?.trim() || null;
  if (def.descricaoLivre && !label) return { error: "Descreva o serviço." };

  const rooms = await prisma.room.findMany({
    where: { projectId, id: { in: input.roomIds } },
    orderBy: { order: "asc" },
  });
  if (rooms.length === 0) return { error: "Selecione ao menos um ambiente." };

  const existentes = await prisma.renovationService.findMany({
    where: { projectId, serviceKey: input.serviceKey, roomId: { in: rooms.map((r) => r.id) }, ...(label ? { label } : {}) },
    select: { roomId: true },
  });
  const jaTem = new Set(existentes.map((e) => e.roomId));

  const ultimo = await prisma.renovationService.findFirst({
    where: { projectId }, orderBy: { order: "desc" }, select: { order: true },
  });
  let ordem = (ultimo?.order ?? -1) + 1;
  const pulados: string[] = [];
  const semMedida: string[] = [];
  const data = [];
  for (const room of rooms) {
    if (jaTem.has(room.id)) { pulados.push(room.name.trim()); continue; }
    const q = def.medida ? medidaSugerida(def, room) : Number(input.quantity);
    if (!q || !(q > 0)) { semMedida.push(room.name.trim()); continue; }
    data.push({
      projectId, roomId: room.id, issueId: null, serviceKey: input.serviceKey,
      label, quantity: q, notes: null, order: ordem++,
    });
  }
  if (data.length > 0) await prisma.renovationService.createMany({ data });
  touch(projectId);
  return { criados: data.length, pulados, semMedida };
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

// ── Estimativa de preço ─────────────────────────────────────────────────────

// Guarda o valor de um ofício ou de um item de gestão. Zero apaga a linha, para
// o relatório distinguir "ainda não estimei" de "é zero mesmo".
export async function setProjectCostLine(
  projectId: string,
  input: { kind: "SERVICO" | "GESTAO"; key: string; amount?: number; percent?: number | null }
) {
  await assertOwnsProject(projectId);
  if (input.kind !== "SERVICO" && input.kind !== "GESTAO") return { error: "Tipo inválido." };

  const amount = Number(input.amount ?? 0);
  const percent = input.percent == null ? null : Number(input.percent);
  if (!Number.isFinite(amount) || amount < 0) return { error: "Valor inválido." };
  if (percent !== null && (!Number.isFinite(percent) || percent < 0)) return { error: "Percentual inválido." };

  const where = { projectId_kind_key: { projectId, kind: input.kind, key: input.key } };
  if (amount === 0 && (percent === null || percent === 0)) {
    await prisma.projectCostLine.deleteMany({ where: { projectId, kind: input.kind, key: input.key } });
  } else {
    await prisma.projectCostLine.upsert({
      where,
      create: { projectId, kind: input.kind, key: input.key, amount, percent },
      update: { amount, percent },
    });
  }
  revalidatePath(`/projetos/${projectId}/diagnostico`);
  return {};
}

// Escopo resumido do relatório. Texto vazio ou null volta ao automático.
export async function setScopeSummary(projectId: string, texto: string | null) {
  await assertOwnsProject(projectId);
  const limpo = (texto ?? "")
    .split("\n")
    .map((l) => l.replace(/^\s*[•\-*]\s*/, "").trim())
    .filter(Boolean)
    .join("\n");
  await prisma.project.update({ where: { id: projectId }, data: { scopeSummary: limpo || null } });
  touch(projectId);
  return {};
}
