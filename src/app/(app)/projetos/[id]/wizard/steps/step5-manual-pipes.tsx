"use client";

import { Wrench, Zap } from "lucide-react";
import type { ManualGroup, ManualCatalogMaterial } from "@/lib/manual-catalog";
import { Step5ManualItems, type ManualMaterial } from "./step5-manual-items";

export type PipeMaterial = ManualMaterial;

type Props = {
  projectId: string;
  groups: ManualGroup[];
  catalogo: ManualCatalogMaterial[];
  initialQuantities: Record<string, number>; // materialId → quantity
};

export function Step5ManualPipes({ projectId, groups, catalogo, initialQuantities }: Props) {
  return (
    <Step5ManualItems
      projectId={projectId}
      title="Hidrossanitário — entrada manual"
      description="Toda a fase hidrossanitária é lançada aqui: tubos, conexões, louças, metais, acessórios e box. O sistema não estima nada disso. A lista mostra o catálogo ativo dessas categorias — informe o que o projeto vai consumir e deixe em branco o resto."
      saveLabel="Salvar hidrossanitário"
      icon={<Wrench className="w-4 h-4 text-cyan-700" />}
      iconClassName="bg-cyan-100"
      focusRingClassName="focus:ring-cyan-500"
      groups={groups}
      catalogo={catalogo}
      block="hidraulica"
      initialQuantities={initialQuantities}
    />
  );
}

export function Step5ManualElectrical({ projectId, groups, catalogo, initialQuantities }: Props) {
  return (
    <Step5ManualItems
      projectId={projectId}
      title="Elétrica — entrada manual"
      description="Toda a fase elétrica é lançada aqui: cabos, eletrodutos, quadro, disjuntores, tomadas, interruptores e luminárias. O sistema não estima nada disso. A lista mostra o catálogo elétrico ativo — informe o que o projeto vai consumir e deixe em branco o resto."
      saveLabel="Salvar elétrica"
      icon={<Zap className="w-4 h-4 text-yellow-700" />}
      iconClassName="bg-yellow-100"
      focusRingClassName="focus:ring-yellow-500"
      groups={groups}
      catalogo={catalogo}
      block="eletrica"
      initialQuantities={initialQuantities}
    />
  );
}
