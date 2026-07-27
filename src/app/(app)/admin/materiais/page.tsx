import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialCategory } from "@prisma/client";
import { MaterialForm } from "./material-form";
import { MaterialsCatalog } from "./materials-catalog";

const categoryLabels: Record<MaterialCategory, string> = {
  TERRAPLENAGEM: "Terraplenagem",
  FUNDACAO: "Fundação",
  ESTRUTURA: "Estrutura",
  ALVENARIA: "Alvenaria",
  LAJE: "Laje",
  COBERTURA: "Cobertura",
  ELETRICA: "Elétrica",
  HIDRAULICA: "Hidráulica/Hidrossanitária",
  REVESTIMENTO: "Revestimento",
  PINTURA: "Pintura",
  ESQUADRIA: "Esquadria/Acabamento",
  ACABAMENTO: "Acabamento",
  LOUCAS_SANITARIAS: "Louças sanitárias",
  METAIS_SANITARIOS: "Metais sanitários",
  ACESSORIOS_HIDRAULICOS: "Acessórios hidráulicos",
  IMPERMEABILIZACAO: "Impermeabilização",
  VIDROS_BOX: "Vidros e box",
  ACESSORIOS_BANHEIRO: "Acessórios de banheiro",
  OUTROS: "Outros",
};

const categoryOrder: MaterialCategory[] = [
  "TERRAPLENAGEM","FUNDACAO","ESTRUTURA","ALVENARIA","LAJE","COBERTURA",
  "ELETRICA","HIDRAULICA","REVESTIMENTO","PINTURA","ESQUADRIA","ACABAMENTO",
  "LOUCAS_SANITARIAS","METAIS_SANITARIOS","ACESSORIOS_HIDRAULICOS",
  "IMPERMEABILIZACAO","VIDROS_BOX","ACESSORIOS_BANHEIRO","OUTROS"
];

export default async function MateriaisPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/projetos");

  const materials = await prisma.material.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const byCategory = new Map<MaterialCategory, typeof materials>();
  for (const m of materials) {
    const list = byCategory.get(m.category) ?? [];
    list.push(m);
    byCategory.set(m.category, list);
  }

  const zeroPrice = materials.filter((m) => m.active && m.currentPrice === 0).length;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materiais e Preços</h1>
          <p className="text-sm text-gray-500 mt-1">
            {materials.length} material(is) cadastrado(s)
            {zeroPrice > 0 && (
              <span className="ml-2 text-amber-700 font-medium">
                • {zeroPrice} sem preço
              </span>
            )}
          </p>
        </div>
      </div>

      <MaterialForm />

      <div className="mt-8">
        <MaterialsCatalog
          materialsByCategory={categoryOrder
            .map((c) => [c, byCategory.get(c) ?? []] as const)
            .filter(([, list]) => list.length > 0)
            .map(([c, list]) => [c, list.map((m) => ({
              id: m.id,
              name: m.name,
              unit: m.unit,
              category: m.category,
              currentPrice: m.currentPrice,
              priceDate: m.priceDate,
              active: m.active,
            }))])}
          categoryLabels={categoryLabels}
        />
      </div>
    </div>
  );
}
