"use server";

// Movimentos do estoque da empresa (depósito) e das ferramentas. O depósito é
// da empresa, não de uma obra: qualquer usuário logado lança; o envio e a
// devolução só valem para obras do próprio usuário, como tudo no sistema.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { recebidoPelaObra, saldosDoDeposito, ondeEstaoAsFerramentas } from "@/lib/stock";

type Resultado = { error?: string };

async function sessao() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

async function assertObra(projectId: string, userId: string) {
  const p = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (!p) redirect("/projetos");
}

const meioDia = (d: string) => new Date(`${d}T12:00:00`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const hoje = () => new Date().toISOString().slice(0, 10);

function revalidar(projectId?: string | null) {
  revalidatePath("/estoque");
  if (projectId) revalidatePath(`/projetos/${projectId}/consumo`);
}

/** Movimentos de um material, no formato do cálculo de saldo. */
async function movimentosDe(materialId: string) {
  const rows = await prisma.stockMovement.findMany({ where: { materialId } });
  return rows.map((r) => ({
    id: r.id, kind: r.kind, materialId: r.materialId, quantity: r.quantity, unitCost: r.unitCost,
    projectId: r.projectId, date: iso(r.date), createdAt: r.createdAt.toISOString(),
  }));
}

function quantidadeValida(q: number) {
  return Number.isFinite(q) && q > 0;
}

// ── Materiais ───────────────────────────────────────────────────────────────

export async function registrarEntrada(input: {
  materialId: string; quantity: number; unitCost: number; supplierId?: string | null; date?: string; notes?: string;
}): Promise<Resultado> {
  const s = await sessao();
  if (!input.materialId) return { error: "Escolha o material." };
  if (!quantidadeValida(input.quantity)) return { error: "Quantidade inválida." };
  if (!Number.isFinite(input.unitCost) || input.unitCost < 0) return { error: "Preço inválido." };

  await prisma.stockMovement.create({
    data: {
      kind: "ENTRADA", materialId: input.materialId, quantity: input.quantity, unitCost: input.unitCost,
      supplierId: input.supplierId || null, date: meioDia(input.date || hoje()),
      notes: input.notes?.trim() || null, createdById: s.userId,
    },
  });
  revalidar();
  return {};
}

export async function enviarParaObra(input: {
  materialId: string; quantity: number; projectId: string; date?: string; notes?: string;
}): Promise<Resultado> {
  const s = await sessao();
  if (!input.materialId) return { error: "Escolha o material." };
  if (!input.projectId) return { error: "Escolha a obra." };
  if (!quantidadeValida(input.quantity)) return { error: "Quantidade inválida." };
  await assertObra(input.projectId, s.userId);

  // Sai pelo custo médio de agora — é o que a obra passa a carregar.
  const saldo = saldosDoDeposito(await movimentosDe(input.materialId)).get(input.materialId);
  await prisma.stockMovement.create({
    data: {
      kind: "ENVIO", materialId: input.materialId, quantity: input.quantity,
      unitCost: saldo?.custoMedio ?? 0, projectId: input.projectId,
      date: meioDia(input.date || hoje()), notes: input.notes?.trim() || null, createdById: s.userId,
    },
  });
  revalidar(input.projectId);
  return {};
}

export async function devolverDaObra(input: {
  materialId: string; quantity: number; projectId: string; date?: string; notes?: string;
}): Promise<Resultado> {
  const s = await sessao();
  if (!input.materialId) return { error: "Escolha o material." };
  if (!input.projectId) return { error: "Escolha a obra." };
  if (!quantidadeValida(input.quantity)) return { error: "Quantidade inválida." };
  await assertObra(input.projectId, s.userId);

  // Volta pelo custo com que saiu para essa obra; se a obra não recebeu
  // nada do depósito (comprou direto), pelo médio do depósito.
  const movs = await movimentosDe(input.materialId);
  const recebido = recebidoPelaObra(movs, input.projectId).get(input.materialId);
  const custo = recebido && recebido.quantidade > 0
    ? recebido.valor / recebido.quantidade
    : saldosDoDeposito(movs).get(input.materialId)?.custoMedio ?? 0;

  await prisma.stockMovement.create({
    data: {
      kind: "DEVOLUCAO", materialId: input.materialId, quantity: input.quantity, unitCost: custo,
      projectId: input.projectId, date: meioDia(input.date || hoje()),
      notes: input.notes?.trim() || null, createdById: s.userId,
    },
  });
  revalidar(input.projectId);
  return {};
}

/** Contagem física: grava a diferença entre o contado e o saldo do sistema. */
export async function registrarContagem(input: {
  materialId: string; contado: number; date?: string; notes?: string;
}): Promise<Resultado> {
  const s = await sessao();
  if (!input.materialId) return { error: "Escolha o material." };
  if (!Number.isFinite(input.contado) || input.contado < 0) return { error: "Quantidade contada inválida." };

  const saldo = saldosDoDeposito(await movimentosDe(input.materialId)).get(input.materialId);
  const diferenca = Math.round((input.contado - (saldo?.quantidade ?? 0)) * 1000) / 1000;
  if (diferenca === 0) return { error: "A contagem bate com o saldo — nada a ajustar." };

  await prisma.stockMovement.create({
    data: {
      kind: "AJUSTE", materialId: input.materialId, quantity: diferenca, unitCost: saldo?.custoMedio ?? 0,
      date: meioDia(input.date || hoje()),
      notes: input.notes?.trim() || `Contagem: ${input.contado}`, createdById: s.userId,
    },
  });
  revalidar();
  return {};
}

export async function excluirMovimento(id: string): Promise<Resultado> {
  const s = await sessao();
  const m = await prisma.stockMovement.findUnique({
    where: { id },
    select: { id: true, projectId: true, project: { select: { userId: true } } },
  });
  if (!m) return {};
  // Movimento de obra só por quem é dono da obra.
  if (m.project && m.project.userId !== s.userId) redirect("/estoque");
  await prisma.stockMovement.delete({ where: { id } });
  revalidar(m.projectId);
  return {};
}

// ── Ferramentas ─────────────────────────────────────────────────────────────

export async function cadastrarFerramenta(input: {
  name: string; code?: string; quantity: number; unitValue?: number; notes?: string;
}): Promise<Resultado> {
  await sessao();
  const nome = input.name?.trim();
  if (!nome) return { error: "Informe o nome da ferramenta." };
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) return { error: "Quantidade inválida." };

  await prisma.tool.create({
    data: {
      name: nome, code: input.code?.trim() || null, unitValue: input.unitValue ?? 0,
      notes: input.notes?.trim() || null,
      movements: { create: { kind: "AQUISICAO", quantity: input.quantity, date: meioDia(hoje()) } },
    },
  });
  revalidar();
  return {};
}

export async function moverFerramenta(input: {
  toolId: string; kind: "ENVIO" | "DEVOLUCAO" | "BAIXA" | "AQUISICAO";
  quantity: number; projectId?: string | null; date?: string; notes?: string;
}): Promise<Resultado> {
  const s = await sessao();
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) return { error: "Quantidade inválida." };
  const precisaObra = input.kind === "ENVIO" || input.kind === "DEVOLUCAO";
  if (precisaObra && !input.projectId) return { error: "Escolha a obra." };
  if (input.projectId) await assertObra(input.projectId, s.userId);

  // Não deixa mandar ou devolver mais do que existe no lugar de origem.
  const movs = (await prisma.toolMovement.findMany({ where: { toolId: input.toolId } })).map((r) => ({
    id: r.id, toolId: r.toolId, kind: r.kind, quantity: r.quantity, projectId: r.projectId,
    date: iso(r.date), createdAt: r.createdAt.toISOString(),
  }));
  const local = ondeEstaoAsFerramentas(movs).get(input.toolId);
  const naOrigem =
    input.kind === "ENVIO" || (input.kind === "BAIXA" && !input.projectId)
      ? local?.deposito ?? 0
      : input.kind === "AQUISICAO"
        ? Infinity
        : local?.porObra.get(input.projectId!) ?? 0;
  if (input.quantity > naOrigem) {
    return { error: `Só há ${naOrigem} ${naOrigem === 1 ? "unidade" : "unidades"} no lugar de origem.` };
  }

  await prisma.toolMovement.create({
    data: {
      toolId: input.toolId, kind: input.kind, quantity: input.quantity,
      projectId: input.projectId || null, date: meioDia(input.date || hoje()),
      notes: input.notes?.trim() || null,
    },
  });
  revalidar(input.projectId);
  return {};
}

export async function excluirMovimentoFerramenta(id: string): Promise<Resultado> {
  const s = await sessao();
  const m = await prisma.toolMovement.findUnique({
    where: { id },
    select: { id: true, projectId: true, project: { select: { userId: true } } },
  });
  if (!m) return {};
  if (m.project && m.project.userId !== s.userId) redirect("/estoque");
  await prisma.toolMovement.delete({ where: { id } });
  revalidar(m.projectId);
  return {};
}

export async function arquivarFerramenta(id: string, ativa: boolean): Promise<Resultado> {
  await sessao();
  await prisma.tool.update({ where: { id }, data: { active: ativa } });
  revalidar();
  return {};
}

export async function editarFerramenta(
  id: string,
  input: { name: string; code?: string; unitValue?: number; notes?: string }
): Promise<Resultado> {
  await sessao();
  const nome = input.name?.trim();
  if (!nome) return { error: "Informe o nome da ferramenta." };
  if (input.unitValue != null && (!Number.isFinite(input.unitValue) || input.unitValue < 0)) {
    return { error: "Valor inválido." };
  }
  await prisma.tool.update({
    where: { id },
    data: {
      name: nome,
      code: input.code?.trim() || null,
      unitValue: input.unitValue ?? 0,
      notes: input.notes?.trim() || null,
    },
  });
  revalidar();
  return {};
}
