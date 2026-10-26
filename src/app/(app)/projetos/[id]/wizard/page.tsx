import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { WizardContainer } from "./wizard-container";
import { buildManualGroups, MANUAL_BLOCK_CATEGORIES } from "@/lib/manual-catalog";
import { SERVICE_BY_KEY } from "@/lib/renovation-services";
import type { MaterialCategory } from "@prisma/client";

export default async function WizardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ etapa?: string }>;
}) {
  const { id } = await params;
  const { etapa } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.userId },
    include: {
      renovationIssues: { orderBy: { order: "asc" } },
      renovationServices: { orderBy: { order: "asc" } },
      rooms: {
        orderBy: { order: "asc" },
        include: {
          fixtures: true,
          joineries: true,
          accessories: true,
          imperm: true,
          wallFinishes: true,
        },
      },
      structure: true,
      roofing: true,
      installations: { include: { electricalPoints: true, hydraulicPoints: true } },
      finishes: { include: { roomFinishes: true } },
      walls: true,
    },
  });

  if (!project) redirect("/projetos");

  const currentStep = etapa ? parseInt(etapa) : Math.min(project.wizardStep, 9);

  // Blocos de entrada manual da Etapa 5 — espelham o catálogo por categoria,
  // então material novo aparece na tela sem tocar em código.
  const manualCats = [
    ...MANUAL_BLOCK_CATEGORIES.hidraulica,
    ...MANUAL_BLOCK_CATEGORIES.eletrica,
  ] as MaterialCategory[];
  const manualMaterials = await prisma.material.findMany({
    where: { category: { in: manualCats }, active: true },
    select: { id: true, name: true, unit: true, currentPrice: true, category: true },
  });
  // Catálogo inteiro para o seletor de item avulso dos blocos manuais: o que se
  // precisa lançar à mão nem sempre está nas categorias do bloco.
  const catalogoCompleto = await prisma.material.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true, currentPrice: true, category: true },
  });

  const manualRows = await prisma.manualBudgetItem.findMany({
    where: { projectId: id },
    include: { material: { select: { name: true, unit: true, currentPrice: true } } },
  });

  // Itens que o usuário adicionou a mão a cada bloco — vêm marcados com `block`
  // porque a categoria do material não diz mais a que bloco pertencem.
  const porId = new Map(catalogoCompleto.map((m) => [m.id, m]));
  const extrasDe = (bloco: string) =>
    manualRows
      .filter((r) => r.block === bloco)
      .map((r) => porId.get(r.materialId))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const hydraulicGroups = buildManualGroups("hidraulica", manualMaterials, extrasDe("hidraulica"));
  const electricalGroups = buildManualGroups("eletrica", manualMaterials, extrasDe("eletrica"));
  const manualPipeQuantities: Record<string, number> = {};
  for (const r of manualRows) manualPipeQuantities[r.materialId] = r.quantity;

  // Etapa 8 — materiais avulsos: só as linhas com fase escolhida pelo usuário.
  // As demais pertencem aos blocos de tubos/cabos da Etapa 5.
  const manualPhaseRows = manualRows
    .filter((r) => r.phase !== null)
    .map((r) => ({
      materialId: r.materialId,
      name: r.material.name,
      unit: r.material.unit,
      quantity: r.quantity,
      currentPrice: r.material.currentPrice,
      phase: r.phase as string,
    }));

  // Serviços da reforma SEM regra de material (louças, elétrica, hidráulica,
  // esquadrias, forro, outros) — a Etapa 8 lista cada um para o usuário saber
  // onde o material à mão vai. A fase sugerida vem da categoria do serviço.
  const CATEGORIA_PARA_FASE: Record<string, string> = {
    "Elétrica": "INSTALACOES_ELETRICAS",
    "Hidráulica": "INSTALACOES_HIDROSSANITARIAS",
    "Louças e metais": "INSTALACOES_HIDROSSANITARIAS",
    "Esquadrias": "ESQUADRIAS",
    "Cobertura": "COBERTURA",
    "Forro": "ACABAMENTO",
    "Outros": "OUTROS",
  };
  const nomeAmbiente = (roomId: string | null) =>
    project.rooms.find((r) => r.id === roomId)?.name ?? "Geral / área externa";
  const servicosPendentes = project.renovationServices
    .map((sv) => {
      const def = SERVICE_BY_KEY.get(sv.serviceKey);
      if (!def || def.materiais) return null;
      const issue = sv.issueId ? project.renovationIssues.find((i) => i.id === sv.issueId) : null;
      return {
        id: sv.id,
        label: sv.label || def.label,
        unit: def.unit,
        quantity: sv.quantity,
        ambiente: nomeAmbiente(sv.roomId),
        problema: issue ? issue.category : null,
        gravidade: issue?.severity ?? null,
        descricao: issue?.description ?? null,
        faseSugerida: CATEGORIA_PARA_FASE[def.categoria] ?? "OUTROS",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Catálogo completo para o buscador da Etapa 8.
  const catalogMaterials = await prisma.material.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true, currentPrice: true, category: true },
  });

  return (
    <WizardContainer
      project={project}
      currentStep={currentStep}
      hydraulicGroups={hydraulicGroups}
      electricalGroups={electricalGroups}
      catalogoCompleto={catalogoCompleto}
      manualPipeQuantities={manualPipeQuantities}
      catalogMaterials={catalogMaterials}
      manualPhaseRows={manualPhaseRows}
      servicosPendentes={servicosPendentes}
    />
  );
}
