import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialCategory } from "@/generated/prisma/index";
import { MaterialForm } from "./material-form";
import { MaterialRow } from "./material-row";

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
  OUTROS: "Outros",
};

const categoryOrder: MaterialCategory[] = [
  "TERRAPLENAGEM","FUNDACAO","ESTRUTURA","ALVENARIA","LAJE","COBERTURA",
  "ELETRICA","HIDRAULICA","REVESTIMENTO","PINTURA","ESQUADRIA","ACABAMENTO","OUTROS"
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

      <div className="flex flex-col gap-6 mt-8">
        {categoryOrder.map((category) => {
          const items = byCategory.get(category);
          if (!items || items.length === 0) return null;
          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{categoryLabels[category]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left font-medium text-gray-500 py-2">Material</th>
                        <th className="text-center font-medium text-gray-500 py-2">Unidade</th>
                        <th className="text-right font-medium text-gray-500 py-2">Preço (R$)</th>
                        <th className="text-center font-medium text-gray-500 py-2">Status</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((material) => (
                        <MaterialRow key={material.id} material={material} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
