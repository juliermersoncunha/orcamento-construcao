import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LaborModel } from "@prisma/client";
import { PrintButton } from "./memorial-print";
import { generateExplanations } from "@/lib/calculations/memorial-calcs";
import { calculateRoomMaterials } from "@/lib/calculations/per-room";
import type { RoomInput, StructureInput, RoofingInput, FinishesInput } from "@/lib/calculations";

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

const GENERAL_PHASES = [
  "TERRAPLENAGEM",
  "FUNDACAO",
  "ESTRUTURA_ALVENARIA",
  "LAJE",
  "ESCADA",
  "COBERTURA",
  "INSTALACOES_ELETRICAS",
  "INSTALACOES_HIDROSSANITARIAS",
  "ACABAMENTO",
  "OUTROS",
];

const ALL_PHASES_ORDER = [
  "TERRAPLENAGEM",
  "FUNDACAO",
  "ESTRUTURA_ALVENARIA",
  "LAJE",
  "ESCADA",
  "COBERTURA",
  "REVESTIMENTOS",
  "PINTURA",
  "INSTALACOES_ELETRICAS",
  "INSTALACOES_HIDROSSANITARIAS",
  "ACABAMENTO",
  "OUTROS",
];

const PROJECT_TYPE_LABELS: Record<string, string> = {
  NOVA_CONSTRUCAO: "Nova Construção",
  REFORMA: "Reforma",
  AMPLIACAO: "Ampliação",
};

const FOUNDATION_LABELS: Record<string, string> = {
  radier: "Radier",
  sapata_corrida: "Sapata corrida",
  sapata_isolada: "Sapata isolada",
  estaca: "Estaca (tubulão/hélice)",
};

const BLOCK_LABELS: Record<string, string> = {
  tijolo_furado: "Tijolo cerâmico furado",
  bloco_concreto: "Bloco de concreto",
  bloco_celular: "Bloco de concreto celular",
};

const ROOF_TYPE_LABELS: Record<string, string> = {
  duas_aguas: "Duas águas",
  quatro_aguas: "Quatro águas",
  uma_agua: "Uma água",
  laje_impermeabilizada: "Laje impermeabilizada",
};

const TILE_TYPE_LABELS: Record<string, string> = {
  ceramica: "Cerâmica",
  fibrocimento: "Fibrocimento",
  metalica: "Metálica",
};

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

export default async function MemorialPage({
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
        orderBy: { order: "asc" },
        include: {
          electricalPoints: true,
          hydraulicPoints: true,
          roomFinishes: true,
        },
      },
      structure: true,
      roofing: true,
      finishes: { include: { roomFinishes: true } },
      budgetItems: {
        include: { material: true },
        orderBy: { createdAt: "asc" },
      },
      laborConfig: { include: { phases: true } },
    },
  });

  if (!project) redirect("/projetos");
  if (project.budgetItems.length === 0) redirect(`/projetos/${id}/orcamento`);

  const totalFloorArea = project.rooms.reduce(
    (sum, r) => sum + r.width * r.length,
    0
  );

  type ItemWithMat = (typeof project.budgetItems)[number];
  const byPhase = new Map<string, ItemWithMat[]>();
  for (const item of project.budgetItems) {
    const list = byPhase.get(item.phase) ?? [];
    list.push(item);
    byPhase.set(item.phase, list);
  }

  const phaseMat = new Map<string, number>();
  for (const [phase, items] of byPhase) {
    phaseMat.set(
      phase,
      items.reduce((s, i) => s + i.quantity * i.unitPriceSnapshot, 0)
    );
  }

  const phaseMO = new Map<string, number>();
  if (project.laborConfig) {
    for (const lp of project.laborConfig.phases) {
      phaseMO.set(
        lp.phase,
        computeMO(
          project.laborConfig.model,
          lp.value,
          phaseMat.get(lp.phase) ?? 0,
          totalFloorArea
        )
      );
    }
  }

  const totalMat = Array.from(phaseMat.values()).reduce((a, b) => a + b, 0);
  const totalMO = Array.from(phaseMO.values()).reduce((a, b) => a + b, 0);
  const totalGeral = totalMat + totalMO;
  const custoM2 = totalFloorArea > 0 ? totalGeral / totalFloorArea : 0;
  const hasMO = project.laborConfig !== null;

  const today = new Date().toLocaleDateString("pt-BR");

  // Build inputs for calculation explanations
  const roomInputs: RoomInput[] = project.rooms.map((r) => {
    const rf = r.roomFinishes[0];
    const ep = r.electricalPoints[0];
    const hp = r.hydraulicPoints[0];
    return {
      name: r.name,
      width: r.width,
      length: r.length,
      height: r.height,
      floorType: rf?.floorType,
      wallTile: rf?.wallTile,
      wallTileHeight: rf?.wallTileHeight,
      paintWalls: rf?.paintWalls,
      electricalOutlets: ep?.outlets,
      electricalSwitches: ep?.switches,
      electricalLightPoints: ep?.lightPoints,
      hydraulicWaterInlets: hp?.waterInlets,
      hydraulicDrainPoints: hp?.drainPoints,
    };
  });

  const structureInput: StructureInput = project.structure
    ? {
        foundationType: project.structure.foundationType,
        structureType: project.structure.structureType,
        blockType: project.structure.blockType,
        floors: project.structure.floors,
        hasLaje: project.structure.hasLaje,
        hasEscada: project.structure.hasEscada,
        pilarMetros: project.structure.pilarMetros,
        pilarLargura: project.structure.pilarLargura,
        pilarAltura: project.structure.pilarAltura,
        vigaMetros: project.structure.vigaMetros,
        vigaLargura: project.structure.vigaLargura,
        vigaAltura: project.structure.vigaAltura,
        sapataQtd: project.structure.sapataQtd,
        sapataLargura: project.structure.sapataLargura,
        sapataCompr: project.structure.sapataCompr,
        sapataAltura: project.structure.sapataAltura,
      }
    : {
        foundationType: "sapata_corrida",
        structureType: "concreto_armado",
        blockType: "tijolo_furado",
        floors: 1,
        hasLaje: false,
        hasEscada: false,
        pilarMetros: 0,
        pilarLargura: 0.15,
        pilarAltura: 0.30,
        vigaMetros: 0,
        vigaLargura: 0.15,
        vigaAltura: 0.40,
        sapataQtd: 0,
        sapataLargura: 0.60,
        sapataCompr: 0.60,
        sapataAltura: 0.30,
      };

  const roofingInput: RoofingInput = project.roofing
    ? {
        roofType: project.roofing.roofType,
        tileType: project.roofing.tileType,
        inclination: project.roofing.inclination,
        hasRoof: project.roofing.hasRoof,
      }
    : { roofType: "duas_aguas", tileType: "ceramica", inclination: 30, hasRoof: true };

  const finishesInput: FinishesInput = project.finishes
    ? {
        doors: project.finishes.doors,
        windows: project.finishes.windows,
        externalDoors: project.finishes.externalDoors,
      }
    : { doors: 0, windows: 0, externalDoors: 1 };

  const explanations = generateExplanations(roomInputs, structureInput, roofingInput, finishesInput);

  function getExplanationsForPhase(phase: string) {
    if (phase === "ESTRUTURA_ALVENARIA") {
      return [
        ...(explanations["ESTRUTURA_ALVENARIA_ESTRUTURA"] ?? []),
        ...(explanations["ESTRUTURA_ALVENARIA_ALVENARIA"] ?? []),
      ];
    }
    return explanations[phase] ?? [];
  }

  const totalWallArea = project.rooms.reduce((sum, r) => {
    const perimeter = 2 * (r.width + r.length);
    return sum + perimeter * r.height;
  }, 0);

  // ── Per-room materials ──
  const priceLookup = new Map<string, number>();
  for (const item of project.budgetItems) {
    if (!priceLookup.has(item.material.name)) {
      priceLookup.set(item.material.name, item.unitPriceSnapshot);
    }
  }

  const roomMaterials = roomInputs.map((room) => ({
    roomName: room.name,
    items: calculateRoomMaterials(room),
  }));

  // ── Consolidated material list (shopping list) ──
  const consolidatedMap = new Map<string, { unit: string; quantity: number; price: number }>();
  for (const item of project.budgetItems) {
    const key = item.material.name;
    const existing = consolidatedMap.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      consolidatedMap.set(key, {
        unit: item.material.unit,
        quantity: item.quantity,
        price: item.unitPriceSnapshot,
      });
    }
  }
  const consolidatedList = Array.from(consolidatedMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price));

  // ── Phase ordering ──
  const generalPhases = GENERAL_PHASES.filter((p) => byPhase.has(p));
  const extraPhases = Array.from(byPhase.keys()).filter(
    (p) => !ALL_PHASES_ORDER.includes(p)
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Action bar */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href={`/projetos/${id}/orcamento`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar ao Orçamento
          </Button>
        </Link>
        <PrintButton />
      </div>

      <div className="print:p-0">
        {/* ═══ 1. HEADER ═══ */}
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
            Memorial Descritivo de Materiais
          </h1>
          <p className="text-sm text-gray-600 mt-1">Orçamento de Construção — Memória de Cálculo</p>
        </div>

        {/* ═══ 2. DADOS DO PROJETO ═══ */}
        <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <div>
            <span className="font-semibold text-gray-700">Projeto:</span>{" "}
            <span className="text-gray-900">{project.name}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Data:</span>{" "}
            <span className="text-gray-900">{today}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Cliente:</span>{" "}
            <span className="text-gray-900">{project.clientName}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Tipo:</span>{" "}
            <span className="text-gray-900">
              {PROJECT_TYPE_LABELS[project.type] ?? project.type}
            </span>
          </div>
          {project.city && (
            <div>
              <span className="font-semibold text-gray-700">Localização:</span>{" "}
              <span className="text-gray-900">
                {project.city}
                {project.state ? `, ${project.state}` : ""}
              </span>
            </div>
          )}
          <div>
            <span className="font-semibold text-gray-700">Área construída:</span>{" "}
            <span className="text-gray-900">{formatNumber(totalFloorArea)} m²</span>
          </div>
        </div>

        {/* ═══ 3. PREMISSAS ═══ */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-1 mb-2">
            Premissas do Projeto
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div>
              <span className="font-semibold text-gray-600">Fundação:</span>{" "}
              {FOUNDATION_LABELS[structureInput.foundationType] ?? structureInput.foundationType}
            </div>
            <div>
              <span className="font-semibold text-gray-600">Alvenaria:</span>{" "}
              {BLOCK_LABELS[structureInput.blockType] ?? structureInput.blockType}
            </div>
            <div>
              <span className="font-semibold text-gray-600">Pavimentos:</span> {structureInput.floors}
            </div>
            <div>
              <span className="font-semibold text-gray-600">Laje:</span>{" "}
              {structureInput.hasLaje ? "Sim" : "Não"}
            </div>
            <div>
              <span className="font-semibold text-gray-600">Cobertura:</span>{" "}
              {ROOF_TYPE_LABELS[roofingInput.roofType] ?? roofingInput.roofType}
              {" — "}
              {TILE_TYPE_LABELS[roofingInput.tileType] ?? roofingInput.tileType}
              {" ("}
              {roofingInput.inclination}°{")"}
            </div>
            <div>
              <span className="font-semibold text-gray-600">Sapatas:</span>{" "}
              {structureInput.sapataQtd} un ({formatNumber(structureInput.sapataLargura)}×{formatNumber(structureInput.sapataCompr)}×{formatNumber(structureInput.sapataAltura)} m)
            </div>
            <div>
              <span className="font-semibold text-gray-600">Pilares:</span>{" "}
              {formatNumber(structureInput.pilarMetros)} m ({formatNumber(structureInput.pilarLargura)}×{formatNumber(structureInput.pilarAltura)} m)
            </div>
            <div>
              <span className="font-semibold text-gray-600">Vigas:</span>{" "}
              {formatNumber(structureInput.vigaMetros)} m ({formatNumber(structureInput.vigaLargura)}×{formatNumber(structureInput.vigaAltura)} m)
            </div>
            <div>
              <span className="font-semibold text-gray-600">Concreto:</span>{" "}
              Feito na obra — traço 1:2:3
            </div>
            <div>
              <span className="font-semibold text-gray-600">Esquadrias:</span>{" "}
              {finishesInput.externalDoors} porta(s) ext., {finishesInput.doors} int., {finishesInput.windows} janela(s)
            </div>
            <div>
              <span className="font-semibold text-gray-600">Área de parede total:</span>{" "}
              {formatNumber(totalWallArea)} m²
            </div>
          </div>
        </div>

        {/* ═══ 4. AMBIENTES ═══ */}
        {project.rooms.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-1 mb-2">
              Ambientes
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left font-medium text-gray-600 py-1">Cômodo</th>
                  <th className="text-center font-medium text-gray-600 py-1">Larg. (m)</th>
                  <th className="text-center font-medium text-gray-600 py-1">Comp. (m)</th>
                  <th className="text-center font-medium text-gray-600 py-1">Pé dir. (m)</th>
                  <th className="text-center font-medium text-gray-600 py-1">Perímetro (m)</th>
                  <th className="text-right font-medium text-gray-600 py-1">Área (m²)</th>
                </tr>
              </thead>
              <tbody>
                {project.rooms.map((room) => {
                  const perimeter = 2 * (room.width + room.length);
                  return (
                    <tr key={room.id} className="border-b border-gray-100">
                      <td className="py-1 text-gray-800">{room.name}</td>
                      <td className="py-1 text-center text-gray-600">
                        {formatNumber(room.width)}
                      </td>
                      <td className="py-1 text-center text-gray-600">
                        {formatNumber(room.length)}
                      </td>
                      <td className="py-1 text-center text-gray-600">
                        {formatNumber(room.height)}
                      </td>
                      <td className="py-1 text-center text-gray-600">
                        {formatNumber(perimeter)}
                      </td>
                      <td className="py-1 text-right font-medium text-gray-800">
                        {formatNumber(room.width * room.length)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-gray-300">
                  <td colSpan={5} className="py-1 text-right font-semibold text-gray-700">
                    Total:
                  </td>
                  <td className="py-1 text-right font-bold text-gray-900">
                    {formatNumber(totalFloorArea)} m²
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ 5. MATERIAIS POR AMBIENTE ═══ */}
        {roomMaterials.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-1 mb-4">
              Materiais por Ambiente
            </h2>

            {roomMaterials.map((rm) => {
              if (rm.items.length === 0) return null;

              const categories = [...new Set(rm.items.map((i) => i.category))];
              let roomTotal = 0;

              return (
                <div key={rm.roomName} className="mb-5 break-inside-avoid">
                  <h3 className="text-sm font-bold text-gray-800 bg-green-50 border border-green-200 px-2 py-1 rounded mb-1">
                    {rm.roomName}
                  </h3>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left font-medium text-gray-600 py-1">Categoria</th>
                        <th className="text-left font-medium text-gray-600 py-1">Material</th>
                        <th className="text-center font-medium text-gray-600 py-1">Qtd</th>
                        <th className="text-center font-medium text-gray-600 py-1">Un</th>
                        <th className="text-right font-medium text-gray-600 py-1">Preço Unit.</th>
                        <th className="text-right font-medium text-gray-600 py-1">Total</th>
                        <th className="text-left font-medium text-gray-600 py-1 pl-2">Memória de Cálculo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => {
                        const catItems = rm.items.filter((i) => i.category === cat);
                        return catItems.map((item, idx) => {
                          const price = priceLookup.get(item.name) ?? 0;
                          const total = item.quantity * price;
                          roomTotal += total;
                          return (
                            <tr key={`${cat}-${idx}`} className="border-b border-gray-50">
                              {idx === 0 && (
                                <td
                                  rowSpan={catItems.length}
                                  className="py-1 text-gray-500 text-xs font-medium align-top"
                                >
                                  {cat}
                                </td>
                              )}
                              <td className="py-1 text-gray-800">{item.name}</td>
                              <td className="py-1 text-center text-gray-600">
                                {formatNumber(item.quantity)}
                              </td>
                              <td className="py-1 text-center text-gray-500">{item.unit}</td>
                              <td className="py-1 text-right text-gray-600">
                                {price > 0 ? formatCurrency(price) : "—"}
                              </td>
                              <td className="py-1 text-right font-medium text-gray-800">
                                {price > 0 ? formatCurrency(total) : "—"}
                              </td>
                              <td className="py-1 text-left text-xs text-gray-500 pl-2">
                                {item.formula}
                              </td>
                            </tr>
                          );
                        });
                      })}
                      <tr className="border-t border-gray-300">
                        <td colSpan={5} className="py-1 text-right font-semibold text-gray-700">
                          Subtotal {rm.roomName}:
                        </td>
                        <td className="py-1 text-right font-bold text-gray-900">
                          {formatCurrency(roomTotal)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ 6. MATERIAIS GERAIS POR ETAPA ═══ */}
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-1 mb-4">
          Materiais Gerais por Etapa — Memória de Cálculo
        </h2>

        {[...generalPhases, ...extraPhases].map((phase) => {
          const items = byPhase.get(phase);
          if (!items || items.length === 0) return null;

          const matTotal = phaseMat.get(phase) ?? 0;
          const moTotal = phaseMO.get(phase) ?? 0;
          const phaseExplanations = getExplanationsForPhase(phase);

          return (
            <div key={phase} className="mb-6 break-inside-avoid">
              <h3 className="text-sm font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded mb-1">
                {PHASE_LABELS[phase] ?? phase}
              </h3>

              {phaseExplanations.length > 0 && (
                <div className="mb-2 px-2 py-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <p className="font-semibold text-blue-800 mb-1">Memória de cálculo:</p>
                  <table className="w-full">
                    <tbody>
                      {phaseExplanations.map((exp, i) => (
                        <tr key={i} className="border-b border-blue-100 last:border-0">
                          <td className="py-0.5 pr-2 font-medium text-blue-900 whitespace-nowrap align-top">
                            {exp.materialName}
                          </td>
                          <td className="py-0.5 pr-2 text-blue-700 align-top">
                            {exp.formula}
                          </td>
                          <td className="py-0.5 text-right font-semibold text-blue-900 whitespace-nowrap align-top">
                            = {exp.result}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left font-medium text-gray-600 py-1">Material</th>
                    <th className="text-center font-medium text-gray-600 py-1">Qtd</th>
                    <th className="text-center font-medium text-gray-600 py-1">Un</th>
                    <th className="text-right font-medium text-gray-600 py-1">Preço Unit.</th>
                    <th className="text-right font-medium text-gray-600 py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-1 text-gray-800">{item.material.name}</td>
                      <td className="py-1 text-center text-gray-600">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="py-1 text-center text-gray-500">{item.material.unit}</td>
                      <td className="py-1 text-right text-gray-600">
                        {formatCurrency(item.unitPriceSnapshot)}
                      </td>
                      <td className="py-1 text-right font-medium text-gray-800">
                        {formatCurrency(item.quantity * item.unitPriceSnapshot)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-300">
                    <td colSpan={4} className="py-1 text-right font-semibold text-gray-700">
                      Subtotal materiais:
                    </td>
                    <td className="py-1 text-right font-bold text-gray-900">
                      {formatCurrency(matTotal)}
                    </td>
                  </tr>
                  {hasMO && moTotal > 0 && (
                    <tr>
                      <td colSpan={4} className="py-1 text-right font-semibold text-gray-700">
                        Mão de obra:
                      </td>
                      <td className="py-1 text-right font-bold text-amber-700">
                        {formatCurrency(moTotal)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* ═══ 7. CONSOLIDADO GERAL ═══ */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-1 mb-2">
            Consolidado Geral — Lista de Compras
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left font-medium text-gray-600 py-1">Material</th>
                <th className="text-center font-medium text-gray-600 py-1">Qtd Total</th>
                <th className="text-center font-medium text-gray-600 py-1">Un</th>
                <th className="text-right font-medium text-gray-600 py-1">Preço Unit.</th>
                <th className="text-right font-medium text-gray-600 py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {consolidatedList.map((item) => (
                <tr key={item.name} className="border-b border-gray-50">
                  <td className="py-1 text-gray-800">{item.name}</td>
                  <td className="py-1 text-center text-gray-600">
                    {formatNumber(item.quantity)}
                  </td>
                  <td className="py-1 text-center text-gray-500">{item.unit}</td>
                  <td className="py-1 text-right text-gray-600">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="py-1 text-right font-medium text-gray-800">
                    {formatCurrency(item.quantity * item.price)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-gray-300">
                <td colSpan={4} className="py-1 text-right font-semibold text-gray-700">
                  Total Materiais:
                </td>
                <td className="py-1 text-right font-bold text-gray-900">
                  {formatCurrency(totalMat)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ═══ 8–10. TOTAIS ═══ */}
        <div className="mt-6 border-t-2 border-gray-800 pt-4">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 font-semibold text-gray-700">Total em Materiais</td>
                <td className="py-1 text-right font-bold text-gray-900">
                  {formatCurrency(totalMat)}
                </td>
              </tr>
              {hasMO && (
                <tr>
                  <td className="py-1 font-semibold text-gray-700">Total Mão de Obra</td>
                  <td className="py-1 text-right font-bold text-gray-900">
                    {formatCurrency(totalMO)}
                  </td>
                </tr>
              )}
              <tr className="border-t border-gray-300">
                <td className="py-2 font-bold text-gray-900 text-base">Total Geral</td>
                <td className="py-2 text-right font-bold text-gray-900 text-base">
                  {formatCurrency(totalGeral)}
                </td>
              </tr>
              {totalFloorArea > 0 && (
                <tr>
                  <td className="py-1 font-semibold text-gray-700">Custo por m²</td>
                  <td className="py-1 text-right font-bold text-gray-900">
                    {formatCurrency(custoM2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          <p>
            Documento gerado em {today} — ObraFácil Orçamento de Construção
          </p>
          <p className="mt-1">
            Os valores e quantitativos são estimativas baseadas nas premissas cadastradas no sistema.
            Coeficientes de perda e consumo seguem referências de mercado.
          </p>
        </div>
      </div>
    </div>
  );
}
