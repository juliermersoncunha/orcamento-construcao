import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialCategory } from "@prisma/client";
import { MaterialForm } from "./material-form";
import { MaterialsCatalog } from "./materials-catalog";
import { MATERIAL_CATEGORY_LABELS, MATERIAL_CATEGORY_ORDER } from "@/lib/material-categories";

const categoryLabels = MATERIAL_CATEGORY_LABELS as Record<MaterialCategory, string>;
const categoryOrder = MATERIAL_CATEGORY_ORDER as MaterialCategory[];

export default async function MateriaisPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/projetos");

  const [materials, suppliers] = await Promise.all([
    prisma.material.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { supplier: { select: { id: true, name: true } } },
    }),
    prisma.supplier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const byCategory = new Map<MaterialCategory, typeof materials>();
  for (const m of materials) {
    const list = byCategory.get(m.category) ?? [];
    list.push(m);
    byCategory.set(m.category, list);
  }

  const zeroPrice = materials.filter((m) => m.active && m.currentPrice === 0).length;

  return (
    <div className="p-8 max-w-7xl">
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

      <MaterialForm suppliers={suppliers} />

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
              quantity: m.quantity,
              brand: m.brand,
              supplierId: m.supplierId,
              supplier: m.supplier,
            }))])}
          categoryLabels={categoryLabels}
          suppliers={suppliers}
        />
      </div>
    </div>
  );
}
