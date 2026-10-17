"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const ROLES_FIXAS = new Set(["PEDREIRO", "PINTOR", "ELETRICISTA", "LIMPEZA"]);

async function assertOwns(projectId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const p = await prisma.project.findFirst({
    where: { id: projectId, userId: session.userId },
    select: { id: true },
  });
  if (!p) redirect("/projetos");
}

async function donoDaLinha(lineId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const l = await prisma.laborLine.findFirst({
    where: { id: lineId, project: { userId: session.userId } },
    select: { id: true, projectId: true, role: true },
  });
  if (!l) redirect("/projetos");
  return l;
}

function touch(projectId: string) {
  revalidatePath(`/projetos/${projectId}/mao-de-obra`);
}

// Linhas fixas: uma por função, criada ao abrir pela primeira vez.
export async function ensureFixedLaborLines(projectId: string) {
  await assertOwns(projectId);
  const existentes = await prisma.laborLine.findMany({
    where: { projectId, role: { in: ["PEDREIRO", "PINTOR", "ELETRICISTA", "LIMPEZA"] } },
    select: { role: true },
  });
  const tem = new Set(existentes.map((e) => e.role));
  const faltam = ["PEDREIRO", "PINTOR", "ELETRICISTA", "LIMPEZA"].filter((r) => !tem.has(r));
  if (faltam.length === 0) return;
  await prisma.laborLine.createMany({
    data: faltam.map((role, i) => ({ projectId, role, order: i })),
  });
}

export async function setLaborLineValue(lineId: string, value: number) {
  const l = await donoDaLinha(lineId);
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) return { error: "Valor inválido." };
  await prisma.laborLine.update({ where: { id: lineId }, data: { value: v } });
  touch(l.projectId);
  return {};
}

export async function updateLaborLineLabel(lineId: string, label: string) {
  const l = await donoDaLinha(lineId);
  if (l.role !== "OUTRO") return { error: "Só linhas 'Outros' aceitam descrição." };
  const t = label.trim();
  if (t.length < 2) return { error: "Informe a descrição." };
  await prisma.laborLine.update({ where: { id: lineId }, data: { label: t } });
  touch(l.projectId);
  return {};
}

export async function addLaborLineOutro(projectId: string, label: string, value: number) {
  await assertOwns(projectId);
  const t = label.trim();
  if (t.length < 2) return { error: "Descreva a função." };
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) return { error: "Valor inválido." };
  const last = await prisma.laborLine.findFirst({
    where: { projectId }, orderBy: { order: "desc" }, select: { order: true },
  });
  await prisma.laborLine.create({
    data: { projectId, role: "OUTRO", label: t, value: v, order: (last?.order ?? 3) + 1 },
  });
  touch(projectId);
  return {};
}

export async function deleteLaborLine(lineId: string) {
  const l = await donoDaLinha(lineId);
  if (ROLES_FIXAS.has(l.role)) {
    // Função fixa não some: zera o valor e fica visível para o usuário saber que existe.
    await prisma.laborLine.update({ where: { id: lineId }, data: { value: 0 } });
  } else {
    await prisma.laborLine.delete({ where: { id: lineId } });
  }
  touch(l.projectId);
  return {};
}
