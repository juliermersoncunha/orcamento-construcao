import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Warehouse } from "lucide-react";
import { saldosDoDeposito, ondeEstaoAsFerramentas } from "@/lib/stock";
import { EstoqueClient } from "./estoque-client";

export default async function EstoquePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [materiais, fornecedores, obras, movimentos, ferramentas] = await Promise.all([
    prisma.material.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true, currentPrice: true },
    }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({
      where: { userId: session.userId, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
    }),
    prisma.stockMovement.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        material: { select: { name: true, unit: true } },
        project: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    }),
    prisma.tool.findMany({
      orderBy: { name: "asc" },
      include: { movements: { include: { project: { select: { name: true } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] } },
    }),
  ]);

  const movs = movimentos.map((m) => ({
    id: m.id, kind: m.kind, materialId: m.materialId, quantity: m.quantity, unitCost: m.unitCost,
    projectId: m.projectId, date: iso(m.date), createdAt: m.createdAt.toISOString(),
  }));
  const saldos = saldosDoDeposito(movs);
  const porId = new Map(materiais.map((m) => [m.id, m]));
  // Material inativo que ainda tem movimento continua aparecendo no saldo.
  const nomeDe = new Map(movimentos.map((m) => [m.materialId, m.material]));

  const locais = ondeEstaoAsFerramentas(
    ferramentas.flatMap((t) => t.movements.map((m) => ({
      id: m.id, toolId: t.id, kind: m.kind, quantity: m.quantity, projectId: m.projectId,
      date: iso(m.date), createdAt: m.createdAt.toISOString(),
    })))
  );
  const nomeObra = new Map(obras.map((o) => [o.id, o.name]));
  for (const t of ferramentas) for (const m of t.movements) if (m.projectId && m.project) nomeObra.set(m.projectId, m.project.name);

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <div className="flex items-center gap-2 mb-1">
        <Warehouse className="w-5 h-5 text-brand-600" />
        <h1 className="text-2xl font-bold text-ink">Estoque</h1>
      </div>
      <p className="text-sm text-ink-3 mb-6">
        Depósito da empresa — material e ferramentas que não são de nenhuma obra até serem enviados.
      </p>

      <EstoqueClient
        materiais={materiais.map((m) => ({ id: m.id, name: m.name, unit: m.unit, preco: m.currentPrice }))}
        fornecedores={fornecedores}
        obras={obras}
        saldos={[...saldos.values()].map((s) => {
          const mat = porId.get(s.materialId) ?? nomeDe.get(s.materialId);
          return {
            materialId: s.materialId,
            name: mat?.name ?? "?",
            unit: mat?.unit ?? "",
            quantidade: s.quantidade,
            custoMedio: s.custoMedio,
            valor: s.valor,
          };
        }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))}
        movimentos={movimentos.map((m) => ({
          id: m.id,
          kind: m.kind,
          materialId: m.materialId,
          material: m.material.name,
          unit: m.material.unit,
          quantity: m.quantity,
          unitCost: m.unitCost,
          obraId: m.projectId,
          obra: m.project?.name ?? null,
          fornecedor: m.supplier?.name ?? null,
          date: iso(m.date),
          notes: m.notes,
        }))}
        ferramentas={ferramentas.map((t) => {
          const l = locais.get(t.id);
          return {
            id: t.id,
            name: t.name,
            code: t.code,
            unitValue: t.unitValue,
            active: t.active,
            total: l?.total ?? 0,
            deposito: l?.deposito ?? 0,
            obras: [...(l?.porObra ?? new Map<string, number>())].map(([id, n]) => ({ id, name: nomeObra.get(id) ?? "obra", n })),
            movimentos: t.movements.map((m) => ({
              id: m.id, kind: m.kind, quantity: m.quantity, obra: m.project?.name ?? null,
              date: iso(m.date), notes: m.notes,
            })),
          };
        })}
      />
    </div>
  );
}
