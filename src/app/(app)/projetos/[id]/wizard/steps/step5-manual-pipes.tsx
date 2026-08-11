"use client";

import { Wrench, Zap } from "lucide-react";
import { PIPE_GROUPS } from "@/lib/pipes-catalog";
import { ELECTRICAL_GROUPS } from "@/lib/electrical-catalog";
import { Step5ManualItems, type ManualMaterial } from "./step5-manual-items";

export type PipeMaterial = ManualMaterial;

type Props = {
  projectId: string;
  materialsByName: Record<string, ManualMaterial>;
  initialQuantities: Record<string, number>; // materialId → quantity
};

export function Step5ManualPipes({ projectId, materialsByName, initialQuantities }: Props) {
  return (
    <Step5ManualItems
      projectId={projectId}
      title="Tubos e conexões — entrada manual"
      description="O sistema não estima metragem de tubos nem quantidade de conexões. Informe as quantidades que o projeto vai consumir; deixe em branco os itens que não usar."
      saveLabel="Salvar tubos e conexões"
      icon={<Wrench className="w-4 h-4 text-cyan-700" />}
      iconClassName="bg-cyan-100"
      focusRingClassName="focus:ring-cyan-500"
      groups={PIPE_GROUPS}
      materialsByName={materialsByName}
      initialQuantities={initialQuantities}
    />
  );
}

export function Step5ManualElectrical({ projectId, materialsByName, initialQuantities }: Props) {
  return (
    <Step5ManualItems
      projectId={projectId}
      title="Cabos e infraestrutura elétrica — entrada manual"
      description="O sistema não estima metragem de cabo, eletroduto nem quantidade de disjuntores. Informe o que o projeto elétrico prevê; deixe em branco o que não usar. Tomadas, interruptores e pontos de luz continuam vindo dos pontos declarados por ambiente."
      saveLabel="Salvar cabos e infraestrutura"
      icon={<Zap className="w-4 h-4 text-yellow-700" />}
      iconClassName="bg-yellow-100"
      focusRingClassName="focus:ring-yellow-500"
      groups={ELECTRICAL_GROUPS}
      materialsByName={materialsByName}
      initialQuantities={initialQuantities}
    />
  );
}
