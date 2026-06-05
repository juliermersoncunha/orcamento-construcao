"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check, ArrowLeft } from "lucide-react";
import { Step1Identificacao } from "./steps/step1-identificacao";
import { Step2Ambientes } from "./steps/step2-ambientes";
import { Step3Estrutura } from "./steps/step3-estrutura";
import { Step4Cobertura } from "./steps/step4-cobertura";
import { Step5Instalacoes } from "./steps/step5-instalacoes";
import { Step6Revestimentos } from "./steps/step6-revestimentos";
import { Step7Muros } from "./steps/step7-muros";
import { Step7Revisao } from "./steps/step7-revisao";

const STEPS = [
  { number: 1, label: "Identificação" },
  { number: 2, label: "Ambientes" },
  { number: 3, label: "Estrutura" },
  { number: 4, label: "Cobertura" },
  { number: 5, label: "Instalações" },
  { number: 6, label: "Revestimentos" },
  { number: 7, label: "Muros" },
  { number: 8, label: "Revisão" },
];

type WizardContainerProps = {
  project: any;
  currentStep: number;
};

export function WizardContainer({ project, currentStep }: WizardContainerProps) {
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
        {STEPS.map((step, idx) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
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
                      isCurrent && "bg-amber-600 text-white ring-2 ring-amber-200",
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
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-1",
                    step.number < currentStep ? "bg-green-400" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {currentStep === 1 && <Step1Identificacao project={project} />}
      {currentStep === 2 && <Step2Ambientes project={project} />}
      {currentStep === 3 && <Step3Estrutura project={project} />}
      {currentStep === 4 && <Step4Cobertura project={project} />}
      {currentStep === 5 && <Step5Instalacoes project={project} />}
      {currentStep === 6 && <Step6Revestimentos project={project} />}
      {currentStep === 7 && <Step7Muros project={project} />}
      {currentStep === 8 && <Step7Revisao project={project} />}
    </div>
  );
}
