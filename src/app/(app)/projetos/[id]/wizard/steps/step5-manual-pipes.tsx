"use client";

import { Wrench, Zap } from "lucide-react";
import type { ManualGroup } from "@/lib/manual-catalog";
import { Step5ManualItems, type ManualMaterial } from "./step5-manual-items";

export type PipeMaterial = ManualMaterial;

type Props = {
  projectId: string;
  groups: ManualGroup[];
  initialQuantities: Record<string, number>; // materialId → quantity
};

export function Step5ManualPipes({ projectId, groups, initialQuantities }: Props) {
  return (
    <Step5ManualItems
      projectId={projectId}
      title="Tubos e conexões — entrada manual"
      description="O sistema não estima metragem de tubos nem quantidade de conexões. A lista mostra todo material hidráulico ativo do catálogo — informe as quantidades que o projeto vai consumir e deixe em branco o que não usar. Caixa d'água e fossa não aparecem aqui: vêm das respostas da Etapa 5."
      saveLabel="Salvar tubos e conexões"
      icon={<Wrench className="w-4 h-4 text-cyan-700" />}
      iconClassName="bg-cyan-100"
      focusRingClassName="focus:ring-cyan-500"
      groups={groups}
      initialQuantities={initialQuantities}
    />
  );
}

export function Step5ManualElectrical({ projectId, groups, initialQuantities }: Props) {
  return (
    <Step5ManualItems
      projectId={projectId}
      title="Cabos e infraestrutura elétrica — entrada manual"
      description="O sistema não estima metragem de cabo, eletroduto nem quantidade de disjuntores. A lista mostra todo material elétrico ativo do catálogo. Tomadas, interruptores e pontos de luz não aparecem aqui: vêm dos pontos declarados por ambiente."
      saveLabel="Salvar cabos e infraestrutura"
      icon={<Zap className="w-4 h-4 text-yellow-700" />}
      iconClassName="bg-yellow-100"
      focusRingClassName="focus:ring-yellow-500"
      groups={groups}
      initialQuantities={initialQuantities}
    />
  );
}
