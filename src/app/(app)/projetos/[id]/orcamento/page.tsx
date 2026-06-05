import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, HardHat, TrendingUp, Receipt, BarChart3 } from "lucide-react";
import Link from "next/link";
import { PhaseType, LaborModel } from "@/generated/prisma/index";
import { validateBudgetAgainstCaixa } from "@/lib/caixa-validation";
import { CaixaValidationPanel } from "@/components/caixa-validation-panel";

const PHASE_LABELS: Record<string, string> = {
  TERRAPLENAGEM: "Terraplenagem",
  FUNDACAO: "Fundação",
  ESTRUTURA_ALVENARIA: "Estrutura e Alvenaria",
  LAJE: "Laje",
  INSTALACOES_ELETRICAS: "Instalações Elétricas",
  INSTALACOES_HIDROSSANITARIAS: "Instalações Hidrossanitárias",
  ESCADA: "Escada",
  REVESTIMENTOS: "Revestimentos",
  PINTURA: "Pintura",
  COBERTURA: "Cobertura",
  ACABAMENTO: "Acabamento",
  OUTROS: "Outros",
};

const PHASE_ORDER: string[] = [
  "TERRAPLENAGEM",
  "FUNDACAO",
  "ESTRUTURA_ALVENARIA",
  "LAJE",
  "ESCADA",
  "COBERTURA",
  "INSTALACOES_ELETRICAS",
  "INSTALACOES_HIDROSSANITARIAS",
  "REVESTIMENTOS",
  "PINTURA",
  "ACABAMENTO",
  "OUTROS",
];

function computeMO(
  model: LaborModel,
  value: number,
  phaseMat: number,
  totalFloorArea: number
): number {
  if (model === "FIXED") return value;
  if (model === "PER_M2") return value * totalFloorArea;
  if (model === "PERCENT") return phaseMat * (value / 100);
  return 0;
}

export default async function OrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.userId },
    include: {
      rooms: { select: { width: true, length: true } },
      budgetItems: {
        include: { material: true },
        orderBy: { createdAt: "asc" },
      },
      laborConfig: { include: { phases: true } },
    },
  });

  if (!project) redirect("/projetos");
  if (project.budgetItems.length === 0) redirect(`/projetos/${id}/wizard?etapa=8`);

  const totalFloorArea = project.rooms.reduce((sum, r) => sum + r.width * r.length, 0);

  // Group by phase
  type ItemWithMat = typeof project.budgetItems[number];
  const byPhase = new Map<string, ItemWithMat[]>();
  for (const item of project.budgetItems) {
    const list = byPhase.get(item.phase) ?? [];
    list.push(item);
    byPhase.set(item.phase, list);
  }

  // Phase material totals
  const phaseMat = new Map<string, number>();
  for (const [phase, items] of byPhase) {
    phaseMat.set(phase, items.reduce((s, i) => s + i.quantity * i.unitPriceSnapshot, 0));
  }

  // MO totals per phase
  const phaseMO = new Map<string, number>();
  if (project.laborConfig) {
    for (const lp of project.laborConfig.phases) {
      phaseMO.set(
        lp.phase,
        computeMO(project.laborConfig.model, lp.value, phaseMat.get(lp.phase) ?? 0, totalFloorArea)
      );
    }
  }

  const totalMat = Array.from(phaseMat.values()).reduce((a, b) => a + b, 0);
  const totalMO = Array.from(phaseMO.values()).reduce((a, b) => a + b, 0);
  const totalGeral = totalMat + totalMO;
  const custoM2 = totalFloorArea > 0 ? totalGeral / totalFloorArea : 0;

  const hasZeroPrice = project.budgetItems.some((i) => i.unitPriceSnapshot === 0);
  const hasMO = project.laborConfig !== null;

  // Validação Caixa — usa somente custo de materiais (sem MO) como base
  const caixaValidation = totalMat > 0
    ? validateBudgetAgainstCaixa(Object.fromEntries(phaseMat), totalMat)
    : [];

  // Ordered phases present in budget
  const orderedPhases = PHASE_ORDER.filter((p) => byPhase.has(p));
  const extraPhases = Array.from(byPhase.keys()).filter((p) => !PHASE_ORDER.includes(p));

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/projetos">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          </div>
          <p className="text-sm text-gray-500 ml-12">
            Cliente: {project.clientName}
            {project.city ? ` • ${project.city}` : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/projetos/${id}/mao-de-obra`}>
            <Button variant="outline" size="sm">
              <HardHat className="w-4 h-4 mr-1" />
              Mão de Obra
            </Button>
          </Link>
          <Link href={`/projetos/${id}/fluxo-caixa`}>
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              Fluxo de Caixa
            </Button>
          </Link>
          <Link href={`/projetos/${id}/custos-indiretos`}>
            <Button variant="outline" size="sm">
              <Receipt className="w-4 h-4 mr-1" />
              Custos Indiretos
            </Button>
          </Link>
          <Link href={`/projetos/${id}/viabilidade`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-1" />
              Viabilidade
            </Button>
          </Link>
          <Link href={`/projetos/${id}/wizard?etapa=8`}>
            <Button variant="outline" size="sm">Recalcular</Button>
          </Link>
        </div>
      </div>

      {hasZeroPrice && (
        <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <strong>Atenção:</strong> Alguns materiais estão com preço R$ 0,00. Configure a tabela de preços em{" "}
          <Link href="/admin/materiais" className="underline font-medium">Administração → Materiais</Link>{" "}
          para obter o total correto.
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="col-span-2 sm:col-span-1 p-5 rounded-xl bg-amber-600 text-white">
          <p className="text-xs font-medium opacity-80">Total Geral</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalGeral)}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">Materiais</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalMat)}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">Mão de Obra</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {hasMO ? formatCurrency(totalMO) : <span className="text-sm text-gray-400">Não config.</span>}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">Custo por m²</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {totalFloorArea > 0 ? formatCurrency(custoM2) : "—"}
          </p>
          {totalFloorArea > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{formatNumber(totalFloorArea)} m² construídos</p>
          )}
        </div>
      </div>

      {/* Validação Caixa */}
      {caixaValidation.length > 0 && (
        <div className="mb-6">
          <CaixaValidationPanel results={caixaValidation} totalMat={totalMat} />
        </div>
      )}

      {/* Items by phase */}
      <div className="flex flex-col gap-6">
        {[...orderedPhases, ...extraPhases].map((phase) => {
          const items = byPhase.get(phase);
          if (!items || items.length === 0) return null;

          const matTotal = phaseMat.get(phase) ?? 0;
          const moTotal = phaseMO.get(phase) ?? 0;
          const phaseGrandTotal = matTotal + moTotal;

          return (
            <Card key={phase}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">{PHASE_LABELS[phase] ?? phase}</CardTitle>
                  <div className="flex items-center gap-4 text-sm">
                    {hasMO && moTotal > 0 && (
                      <span className="text-gray-500">
                        Mat: {formatCurrency(matTotal)} · MO: {formatCurrency(moTotal)}
                      </span>
                    )}
                    <span className="text-base font-bold text-amber-700">
                      {formatCurrency(phaseGrandTotal)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left font-medium text-gray-500 py-2">Material</th>
                        <th className="text-center font-medium text-gray-500 py-2">Qtd</th>
                        <th className="text-center font-medium text-gray-500 py-2">Un</th>
                        <th className="text-right font-medium text-gray-500 py-2">Preço Unit.</th>
                        <th className="text-right font-medium text-gray-500 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 pr-4 text-gray-800">{item.material.name}</td>
                          <td className="py-2 px-2 text-center font-medium">
                            {formatNumber(item.quantity)}
                          </td>
                          <td className="py-2 px-2 text-center text-gray-500">
                            {item.material.unit}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-600">
                            {item.unitPriceSnapshot > 0
                              ? formatCurrency(item.unitPriceSnapshot)
                              : <Badge variant="warning">Sem preço</Badge>}
                          </td>
                          <td className="py-2 pl-2 text-right font-semibold text-gray-900">
                            {item.unitPriceSnapshot > 0
                              ? formatCurrency(item.quantity * item.unitPriceSnapshot)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                      {hasMO && moTotal > 0 && (
                        <tr className="border-b border-amber-100 bg-amber-50/50">
                          <td className="py-2 pr-4 text-amber-800 font-medium">
                            Mão de Obra — {PHASE_LABELS[phase] ?? phase}
                          </td>
                          <td colSpan={3}></td>
                          <td className="py-2 pl-2 text-right font-semibold text-amber-700">
                            {formatCurrency(moTotal)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Grand total footer */}
      <div className="mt-6 p-5 rounded-xl border-2 border-amber-200 bg-amber-50 flex justify-between items-center">
        <div>
          <p className="text-sm text-amber-800 font-medium">Total Geral do Orçamento</p>
          {hasMO && (
            <p className="text-xs text-amber-600 mt-0.5">
              Materiais: {formatCurrency(totalMat)} + Mão de Obra: {formatCurrency(totalMO)}
            </p>
          )}
        </div>
        <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalGeral)}</p>
      </div>
    </div>
  );
}
