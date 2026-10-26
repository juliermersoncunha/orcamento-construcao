"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check, ArrowLeft } from "lucide-react";
import { Step1Identificacao } from "./steps/step1-identificacao";
import { Step2Ambientes } from "./steps/step2-ambientes";
import { Step3Diagnostico } from "./steps/step3-diagnostico";
import { Step3Estrutura } from "./steps/step3-estrutura";
import { Step4Cobertura } from "./steps/step4-cobertura";
import { Step5Instalacoes } from "./steps/step5-instalacoes";
import { Step6Revestimentos } from "./steps/step6-revestimentos";
import { Step7Muros } from "./steps/step7-muros";
import { Step7Revisao } from "./steps/step7-revisao";
import { Step5ManualElectrical, Step5ManualPipes } from "./steps/step5-manual-pipes";
import {
  Step8MateriaisAvulsos,
  type CatalogMaterial,
  type ManualPhaseRow,
} from "./steps/step8-materiais-avulsos";

const STEPS = [
  { number: 1, label: "Identificação" },
  { number: 2, label: "Ambientes" },
  { number: 3, label: "Estrutura" },
  { number: 4, label: "Cobertura" },
  { number: 5, label: "Instalações" },
  { number: 6, label: "Revestimentos" },
  { number: 7, label: "Muros" },
  { number: 8, label: "Materiais" },
  { number: 9, label: "Revisão" },
];

// Reforma não descreve a casa inteira: depois dos ambientes vem o diagnóstico
// (problemas → serviços → material) e as etapas 4 a 7 da construção somem.
// Os números ficam os mesmos das etapas reaproveitadas, assim os links de
// avançar/voltar que já existem continuam certos (2 → 3, 8 → 9).
const STEPS_REFORMA = [
  { number: 1, label: "Identificação" },
  { number: 2, label: "Ambientes" },
  { number: 3, label: "Diagnóstico" },
  { number: 8, label: "Materiais" },
  { number: 9, label: "Revisão" },
];

import type { ManualGroup, ManualCatalogMaterial } from "@/lib/manual-catalog";

type WizardContainerProps = {
  project: any;
  currentStep: number;
  hydraulicGroups: ManualGroup[];
  electricalGroups: ManualGroup[];
  catalogoCompleto: ManualCatalogMaterial[];
  manualPipeQuantities: Record<string, number>;
  catalogMaterials: CatalogMaterial[];
  manualPhaseRows: ManualPhaseRow[];
  servicosPendentes: {
    id: string; label: string; unit: string; quantity: number;
    ambiente: string; problema: string | null;
    descricao: string | null; faseSugerida: string;
  }[];
};

export function WizardContainer({
  project,
  currentStep,
  hydraulicGroups,
  electricalGroups,
  catalogoCompleto,
  manualPipeQuantities,
  catalogMaterials,
  manualPhaseRows,
  servicosPendentes,
}: WizardContainerProps) {
  const reforma = project.type === "REFORMA";
  const etapas = reforma ? STEPS_REFORMA : STEPS;
  // Na reforma, as etapas 4–7 não existem; um link antigo cai no diagnóstico.
  const etapa = reforma && currentStep >= 4 && currentStep <= 7 ? 3 : currentStep;
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/projetos"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Projetos
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">{project.name}</span>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-0 mb-10 overflow-x-auto pb-2">
        {etapas.map((step, idx) => {
          const isCompleted = step.number < etapa;
          const isCurrent = step.number === etapa;
          const isReachable = step.number <= project.wizardStep;

          return (
            <div key={step.number} className="flex items-center shrink-0">
              {isReachable ? (
                <Link
                  href={`/projetos/${project.id}/wizard?etapa=${step.number}`}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                      isCompleted && "bg-green-500 text-white",
                      isCurrent && "bg-brand-600 text-white ring-2 ring-brand-200",
                      !isCompleted && !isCurrent && "bg-gray-200 text-gray-500"
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      isCurrent ? "text-amber-700 font-medium" : "text-gray-400"
                    )}
                  >
                    {step.label}
                  </span>
                </Link>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-300">
                    {step.number}
                  </div>
                  <span className="text-xs text-gray-300">{step.label}</span>
                </div>
              )}
              {idx < etapas.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-1",
                    step.number < etapa ? "bg-green-400" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {etapa === 1 && <Step1Identificacao project={project} />}
      {etapa === 2 && <Step2Ambientes project={project} />}
      {etapa === 3 && (reforma ? <Step3Diagnostico project={project} /> : <Step3Estrutura project={project} />)}
      {etapa === 4 && <Step4Cobertura project={project} />}
      {etapa === 5 && (
        <Step5Instalacoes
          project={project}
          hydraulicGroups={hydraulicGroups}
          electricalGroups={electricalGroups}
          catalogoCompleto={catalogoCompleto}
          manualPipeQuantities={manualPipeQuantities}
        />
      )}
      {etapa === 6 && <Step6Revestimentos project={project} />}
      {etapa === 7 && <Step7Muros project={project} />}
      {/* Reforma não passa pela Etapa 5: os blocos de elétrica e hidráulica da
          casa toda (quantidade por material, salvos de uma vez) ficam aqui. */}
      {etapa === 8 && reforma && (
        // Fechado por padrão: a lista do catálogo é longa e empurrava a etapa
        // para baixo. Abre só quando o usuário quer lançar a casa toda.
        <details className="mb-6 rounded-xl border border-gray-200 bg-white">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-xl">
            Elétrica e hidráulica da casa toda — lançar em lista (ex.: 10 interruptores)
          </summary>
          <div className="flex flex-col gap-6 p-4 pt-2">
          <Step5ManualElectrical
            projectId={project.id}
            groups={electricalGroups}
            catalogo={catalogoCompleto}
            initialQuantities={manualPipeQuantities}
          />
          <Step5ManualPipes
            projectId={project.id}
            groups={hydraulicGroups}
            catalogo={catalogoCompleto}
            initialQuantities={manualPipeQuantities}
          />
          </div>
        </details>
      )}
      {etapa === 8 && (
        <Step8MateriaisAvulsos
          projectId={project.id}
          materials={catalogMaterials}
          rows={manualPhaseRows}
          ambientes={(project.rooms ?? []).map((r: { name: string }) => r.name.trim())}
          servicosPendentes={project.type === "REFORMA" ? servicosPendentes : []}
        />
      )}
      {etapa === 9 && <Step7Revisao project={project} />}
    </div>
  );
}
