import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Plus, HardHat, ChevronRight, Calendar, User } from "lucide-react";
import { ProjectStatus } from "@/generated/prisma";

const statusLabel: Record<ProjectStatus, string> = {
  RASCUNHO: "Rascunho",
  FINALIZADO: "Finalizado",
  ENVIADO: "Enviado ao cliente",
};

const statusVariant: Record<
  ProjectStatus,
  "secondary" | "default" | "success" | "warning" | "destructive" | "outline"
> = {
  RASCUNHO: "secondary",
  FINALIZADO: "success",
  ENVIADO: "default",
};

const typeLabel = {
  NOVA_CONSTRUCAO: "Nova Construção",
  REFORMA: "Reforma",
  AMPLIACAO: "Ampliação",
};

export default async function ProjetosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { userId: session.userId },
    include: {
      budgetItems: { select: { quantity: true, unitPriceSnapshot: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {projects.length} projeto{projects.length !== 1 ? "s" : ""} encontrado
            {projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/projetos/novo">
          <Button>
            <Plus className="w-4 h-4" />
            Novo Projeto
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <HardHat className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Nenhum projeto ainda</h2>
          <p className="text-gray-500 mb-6 max-w-sm">
            Crie seu primeiro projeto para começar o levantamento de materiais e orçamento.
          </p>
          <Link href="/projetos/novo">
            <Button>
              <Plus className="w-4 h-4" />
              Criar Projeto
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const total = project.budgetItems.reduce(
              (sum, item) => sum + item.quantity * item.unitPriceSnapshot,
              0
            );
            const hasOrçamento = project.budgetItems.length > 0;

            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{project.name}</CardTitle>
                    <Badge variant={statusVariant[project.status]}>
                      {statusLabel[project.status]}
                    </Badge>
                  </div>
                  <span className="inline-block text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full w-fit">
                    {typeLabel[project.type]}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{project.clientName}</span>
                    </div>
                    {project.city && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {project.city}
                          {project.state ? `, ${project.state}` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {hasOrçamento && (
                    <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <p className="text-xs text-amber-700 font-medium">Total do orçamento</p>
                      <p className="text-lg font-bold text-amber-900">{formatCurrency(total)}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link href={`/projetos/${project.id}/wizard`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        {project.wizardStep < 7 ? "Continuar" : "Editar"}
                      </Button>
                    </Link>
                    {hasOrçamento && (
                      <Link href={`/projetos/${project.id}/orcamento`}>
                        <Button size="sm">
                          Ver Orçamento
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
