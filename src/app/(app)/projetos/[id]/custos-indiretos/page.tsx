import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { CustosForm } from "./custos-form";

export default async function CustosIndiretosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.userId },
    include: { indirectCosts: { orderBy: { category: "asc" } } },
  });
  if (!project) redirect("/projetos");

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/projetos/${id}/orcamento`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-amber-600" />
          <h1 className="text-xl font-bold text-gray-900">Custos Indiretos</h1>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Registre aqui custos que não são materiais de obra: projeto, regularizações, taxas cartoriais,
        topografia, licenças e outros.
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Custos do projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <CustosForm projectId={id} costs={project.indirectCosts} />
        </CardContent>
      </Card>

      <div className="flex justify-end mt-4">
        <Link href={`/projetos/${id}/viabilidade`}>
          <Button>Ver Viabilidade Financeira →</Button>
        </Link>
      </div>
    </div>
  );
}
