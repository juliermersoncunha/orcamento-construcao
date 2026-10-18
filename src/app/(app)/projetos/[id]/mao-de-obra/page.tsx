import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HardHat } from "lucide-react";
import Link from "next/link";
import { MaoDeObraForm } from "./mao-de-obra-form";
import { ensureFixedLaborLines } from "@/app/actions/labor-lines";
import { MANAGEMENT_ITEMS } from "@/lib/renovation-services";

export default async function MaoDeObraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.userId },
    select: { id: true, name: true },
  });
  if (!project) redirect("/projetos");

  // Cria as 4 funções fixas quando o projeto chega aqui pela primeira vez.
  await ensureFixedLaborLines(id);
  const linhas = await prisma.laborLine.findMany({
    where: { projectId: id },
    orderBy: { order: "asc" },
    select: { id: true, role: true, label: true, value: true },
  });

  // Gestão da obra (Mobilização, Logística, Gestão, BDI). Vive em ProjectCostLine
  // e é compartilhada com o painel de estimativa do diagnóstico — preencher aqui
  // reflete lá e vice-versa.
  // Material do orçamento — entra na base do BDI.
  const itens = await prisma.budgetItem.findMany({
    where: { projectId: id },
    select: { quantity: true, unitPriceSnapshot: true },
  });
  const materiais = itens.reduce((s, i) => s + i.quantity * i.unitPriceSnapshot, 0);

  const gestaoLines = await prisma.projectCostLine.findMany({
    where: { projectId: id, kind: "GESTAO" },
    select: { key: true, amount: true, percent: true },
  });
  const gestao = MANAGEMENT_ITEMS.map((item) => {
    const l = gestaoLines.find((x) => x.key === item.key);
    return { ...item, amount: l?.amount ?? 0, percent: l?.percent ?? null };
  });

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/projetos/${id}/orcamento`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex items-center gap-2">
          <HardHat className="w-5 h-5 text-amber-600" />
          <h1 className="text-xl font-bold text-gray-900">Mão de Obra</h1>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Informe o valor total previsto de cada função. Para funções que não têm aqui, use <strong>Outros</strong>.
      </p>

      <MaoDeObraForm projectId={id} linhas={linhas} gestao={gestao} materiais={materiais} />
    </div>
  );
}
