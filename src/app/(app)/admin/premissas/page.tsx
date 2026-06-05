import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SlidersHorizontal } from "lucide-react";
import { PremissasForm } from "./premissas-form";

export default async function PremissasPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/projetos");

  const premises = await prisma.globalPremise.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <SlidersHorizontal className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Premissas de Cálculo</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Coeficientes usados no motor de cálculo de materiais. Alterações valem para novos cálculos.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Coeficientes por Categoria</CardTitle>
          <CardDescription>
            Edite os valores e clique em Salvar. Os novos coeficientes serão aplicados ao próximo recálculo de orçamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PremissasForm premises={premises} />
        </CardContent>
      </Card>
    </div>
  );
}
