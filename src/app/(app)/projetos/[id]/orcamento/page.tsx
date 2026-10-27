import { prisma } from "@/lib/prisma";
import { montarResumoCustos } from "@/lib/cost-summary";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, ClipboardList, Stethoscope, HardHat, TrendingUp, Receipt, BarChart3, FileText } from "lucide-react";
import Link from "next/link";
import { validateBudgetAgainstCaixa } from "@/lib/caixa-validation";
import { CaixaValidationPanel } from "@/components/caixa-validation-panel";
import { validateProject } from "@/lib/calculations/project-validation";
import { ProjectValidationPanel } from "@/components/project-validation-panel";
import { MissingMaterialsPanel } from "@/components/missing-materials-panel";
import { MATERIAL_CATEGORIES } from "@/lib/material-categories";
import { ItensPorFase } from "./itens-por-fase";

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
  ESQUADRIAS: "Esquadrias",
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
  "ESQUADRIAS",
  "ACABAMENTO",
  "OUTROS",
];

// O mesmo material entra em mais de uma linha da fase quando vem de serviços
// diferentes (ex.: cimento do contrapiso e do reboco). Na tela, uma linha só
// por material, com a quantidade somada e o preço médio ponderado.
function unificarPorMaterial(
  phase: string,
  items: { materialId: string; quantity: number; unitPriceSnapshot: number; material: { name: string; unit: string } }[]
) {
  const porMaterial = new Map<string, { id: string; materialId: string; name: string; unit: string; quantity: number; total: number }>();
  for (const item of items) {
    const atual = porMaterial.get(item.materialId);
    if (atual) {
      atual.quantity += item.quantity;
      atual.total += item.quantity * item.unitPriceSnapshot;
    } else {
      porMaterial.set(item.materialId, {
        id: `${phase}:${item.materialId}`,
        materialId: item.materialId,
        name: item.material.name,
        unit: item.material.unit,
        quantity: item.quantity,
        total: item.quantity * item.unitPriceSnapshot,
      });
    }
  }
  return [...porMaterial.values()].map(({ total, ...m }) => ({
    ...m,
    unitPrice: m.quantity > 0 ? total / m.quantity : 0,
  }));
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
      rooms: {
        include: {
          fixtures: true,
          joineries: true,
          accessories: true,
          imperm: true,
          wallFinishes: true,
        },
      },
      budgetItems: {
        include: { material: true },
        orderBy: { createdAt: "asc" },
      },
      laborLines: { select: { role: true, label: true, value: true } },
      costLines: { where: { kind: "GESTAO" } },
      installations: { include: { electricalPoints: true, hydraulicPoints: true } },
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

  // Phase material totals. BudgetItem já contém os avulsos da Etapa 8 —
  // calculateAndSaveBudget copia ManualBudgetItem para cá.
  const phaseMat = new Map<string, number>();
  for (const [phase, items] of byPhase) {
    phaseMat.set(phase, items.reduce((s, i) => s + i.quantity * i.unitPriceSnapshot, 0));
  }

  // Mão de obra agora vem por função (pedreiro, pintor...), não por fase.
  // phaseMO fica em zero para preservar a tabela mat × MO por fase que existia;
  // o total de MO soma as linhas novas e vai como linha única no quadro geral.
  const phaseMO = new Map<string, number>();

  const totalMat = Array.from(phaseMat.values()).reduce((a, b) => a + b, 0);
  // Total = material + mão de obra + gestão da obra (BDI sobre o custo direto).
  const resumo = montarResumoCustos(totalMat, project.laborLines, project.costLines);
  const totalMO = resumo.totalMO;
  const totalGestao = resumo.totalGestao;
  const totalGeral = resumo.total;
  const custoM2 = totalFloorArea > 0 ? totalGeral / totalFloorArea : 0;

  const hasZeroPrice = project.budgetItems.some((i) => i.unitPriceSnapshot === 0);
  const hasMO = totalMO > 0;

  // Validação Caixa — usa somente custo de materiais (sem MO) como base
  const caixaValidation = totalMat > 0
    ? validateBudgetAgainstCaixa(Object.fromEntries(phaseMat), totalMat)
    : [];

  // Checklist de revisão: o que está ativo no catálogo e não entrou aqui.
  // Com tubos, cabos, madeiramento e esquadrias informados manualmente, é o
  // lugar onde um esquecimento aparece.
  const usedMaterialIds = new Set(project.budgetItems.map((i) => i.materialId));
  const missingMaterials = (
    await prisma.material.findMany({
      where: { active: true, id: { notIn: [...usedMaterialIds] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true, currentPrice: true, category: true },
    })
  ).map((m) => ({ ...m, category: m.category as string }));
  const categoryLabels = Object.fromEntries(MATERIAL_CATEGORIES.map((c) => [c.value, c.label]));

  // Consistência do projeto — equipamentos vs. pontos declarados vs. catálogo.
  // Recalculado a cada render para refletir edições feitas depois de gerar.
  const premiseRows = await prisma.globalPremise.findMany({ select: { key: true, value: true } });

  const declaredByRoom = new Map<string, {
    roomId: string; outlets: number; switches: number; lightPoints: number;
    waterInlets: number; drainPoints: number;
  }>();
  for (const ep of project.installations?.electricalPoints ?? []) {
    const d = declaredByRoom.get(ep.roomId) ?? {
      roomId: ep.roomId, outlets: 0, switches: 0, lightPoints: 0, waterInlets: 0, drainPoints: 0,
    };
    d.outlets += ep.outlets; d.switches += ep.switches; d.lightPoints += ep.lightPoints;
    declaredByRoom.set(ep.roomId, d);
  }
  for (const hp of project.installations?.hydraulicPoints ?? []) {
    const d = declaredByRoom.get(hp.roomId) ?? {
      roomId: hp.roomId, outlets: 0, switches: 0, lightPoints: 0, waterInlets: 0, drainPoints: 0,
    };
    d.waterInlets += hp.waterInlets; d.drainPoints += hp.drainPoints;
    declaredByRoom.set(hp.roomId, d);
  }

  const zeroPriceMaterials = Array.from(
    new Set(
      project.budgetItems
        .filter((i) => i.unitPriceSnapshot === 0 && i.quantity > 0)
        .map((i) => i.material.name)
    )
  ).sort();

  const projectIssues = validateProject({
    rooms: project.rooms.map((room) => ({
      id: room.id, name: room.name, roomType: room.roomType,
      width: room.width, length: room.length, height: room.height,
      fixtures: room.fixtures.map((f) => ({
        id: f.id, roomId: f.roomId, fixtureType: f.fixtureType,
        quantity: f.quantity, configJson: f.configJson,
        includedComponents: f.includedComponents,
      })),
      joineries: room.joineries.map((j) => ({
        id: j.id, roomId: j.roomId, joineryType: j.joineryType, subtype: j.subtype,
        quantity: j.quantity, includedComponents: j.includedComponents,
        width: j.width, height: j.height, configJson: j.configJson,
      })),
      accessories: room.accessories.map((a) => ({
        id: a.id, roomId: a.roomId, accessoryType: a.accessoryType,
        quantity: a.quantity, configJson: a.configJson,
      })),
      imperm: room.imperm ? {
        roomId: room.imperm.roomId, scope: room.imperm.scope, area: room.imperm.area,
        wallHeight: room.imperm.wallHeight, ralos: room.imperm.ralos,
        tubulacoes: room.imperm.tubulacoes, system: room.imperm.system,
        coats: room.imperm.coats, mechProtection: room.imperm.mechProtection,
      } : null,
      wallFinishes: room.wallFinishes.map((w) => ({
        wallSide: w.wallSide, hasTile: w.hasTile, tileHeight: w.tileHeight,
        wallLength: w.wallLength ?? null,
        openingsM2: w.openingsM2 ?? 0,
      })),
    })),
    declared: Array.from(declaredByRoom.values()),
    premises: premiseRows,
    zeroPriceMaterials,
  });

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
          {project.type === "REFORMA" && (
            <Link href={`/projetos/${id}/diagnostico`}>
              <Button variant="outline" size="sm">
                <Stethoscope className="w-4 h-4 mr-1" />
                Relatório do diagnóstico
              </Button>
            </Link>
          )}
          <Link href={`/projetos/${id}/cronograma`}>
            <Button variant="outline" size="sm">
              <CalendarDays className="w-4 h-4 mr-1" />
              Planejamento
            </Button>
          </Link>
          <Link href={`/projetos/${id}/consumo`}>
            <Button variant="outline" size="sm">
              <ClipboardList className="w-4 h-4 mr-1" />
              Consumo
            </Button>
          </Link>
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
          <Link href={`/projetos/${id}/memorial`}>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-1" />
              Memorial Descritivo
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
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="col-span-2 sm:col-span-1 p-5 rounded-xl bg-brand-600 text-white">
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
          <p className="text-xs text-gray-500">Gestão da obra</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {totalGestao > 0 ? formatCurrency(totalGestao) : <span className="text-sm text-gray-400">Não config.</span>}
          </p>
          {resumo.gestao.find((g) => g.percent) && (
            <p className="text-xs text-gray-400 mt-0.5">inclui BDI de {resumo.gestao.find((g) => g.percent)!.percent!.toLocaleString("pt-BR")}%</p>
          )}
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

      {/* Consistência do projeto — vem antes da validação de faixas porque
          aponta o que torna os próprios números não confiáveis */}
      <div className="mb-6">
        <ProjectValidationPanel issues={projectIssues} />
      </div>

      {/* Validação Caixa */}
      {caixaValidation.length > 0 && (
        <div className="mb-6">
          <CaixaValidationPanel results={caixaValidation} totalMat={totalMat} />
        </div>
      )}

      {/* Checklist de revisão — cadastrado mas fora deste orçamento */}
      <div className="mb-6">
        <MissingMaterialsPanel materials={missingMaterials} categoryLabels={categoryLabels} />
      </div>

      {/* Items by phase — com seleção e cópia para mensagem / Excel */}
      <ItensPorFase
        projeto={project.name}
        hasMO={hasMO}
        fases={[...orderedPhases, ...extraPhases]
          .filter((phase) => (byPhase.get(phase)?.length ?? 0) > 0)
          .map((phase) => ({
            phase,
            label: PHASE_LABELS[phase] ?? phase,
            matTotal: phaseMat.get(phase) ?? 0,
            moTotal: phaseMO.get(phase) ?? 0,
            items: unificarPorMaterial(phase, byPhase.get(phase)!),
          }))}
      />

      {/* Grand total footer */}
      <div className="mt-6 p-5 rounded-xl border-2 border-amber-200 bg-amber-50 flex justify-between items-center">
        <div>
          <p className="text-sm text-amber-800 font-medium">Total Geral do Orçamento</p>
          {(hasMO || totalGestao > 0) && (
            <p className="text-xs text-amber-600 mt-0.5">
              Materiais: {formatCurrency(totalMat)} + Mão de Obra: {formatCurrency(totalMO)}
              {totalGestao > 0 && <> + Gestão da obra: {formatCurrency(totalGestao)}</>}
            </p>
          )}
        </div>
        <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalGeral)}</p>
      </div>
    </div>
  );
}
