import Link from "next/link";
import { montarResumoCustos } from "@/lib/cost-summary";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Plus, HardHat, ChevronRight, Calendar, User, Archive } from "lucide-react";
import { BotaoArquivar } from "./botao-arquivar";
import { ProjectStatus } from "@prisma/client";

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

export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: Promise<{ arquivados?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Arquivados ficam fora da lista por padrão; o filtro acima traz os dois lados.
  const verArquivados = (await searchParams).arquivados === "1";

  const projects = await prisma.project.findMany({
    where: { userId: session.userId, archivedAt: verArquivados ? { not: null } : null },
    include: {
      budgetItems: { select: { quantity: true, unitPriceSnapshot: true } },
      laborLines: { select: { role: true, label: true, value: true } },
      costLines: { where: { kind: "GESTAO" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const totalArquivados = await prisma.project.count({
    where: { userId: session.userId, archivedAt: { not: null } },
  });
  const totalAtivos = await prisma.project.count({
    where: { userId: session.userId, archivedAt: null },
  });

  const abas: { href: string; rotulo: string; ativa: boolean }[] = [
    { href: "/projetos", rotulo: `Ativos (${totalAtivos})`, ativa: !verArquivados },
    { href: "/projetos?arquivados=1", rotulo: `Arquivados (${totalArquivados})`, ativa: verArquivados },
  ];

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Projetos</h1>
          <p className="text-sm text-ink-3 mt-1">
            {projects.length} projeto{projects.length !== 1 ? "s" : ""}{" "}
            {verArquivados ? "arquivado" : "encontrado"}
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

      <div className="mb-6 flex w-fit rounded-full bg-white p-1 text-xs shadow-card">
        {abas.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`rounded-full px-3 py-1.5 font-semibold ${
              a.ativa ? "grad-brand text-white" : "text-ink-2 hover:bg-surface"
            }`}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      {projects.length === 0 && verArquivados ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
            <Archive className="w-8 h-8 text-ink-3" />
          </div>
          <h2 className="text-lg font-semibold text-ink mb-2">Nenhum projeto arquivado</h2>
          <p className="text-ink-3 max-w-sm">
            Projetos arquivados somem da lista de ativos sem perder nada, e voltam por aqui.
          </p>
        </div>
      ) : projects.length === 0 ? (
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
            const materiais = project.budgetItems.reduce(
              (sum, item) => sum + item.quantity * item.unitPriceSnapshot,
              0
            );
            const total = montarResumoCustos(materiais, project.laborLines, project.costLines, project.type).total;
            const hasOrçamento = project.budgetItems.length > 0;

            return (
              <Card
                key={project.id}
                className={`hover:shadow-card-strong transition-shadow ${verArquivados ? "opacity-80" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{project.name}</CardTitle>
                    <Badge variant={statusVariant[project.status]}>
                      {statusLabel[project.status]}
                    </Badge>
                  </div>
                  <span className="inline-block text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full w-fit">
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
                    <div className="mb-4 p-3 rounded-xl bg-surface">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-3">Total do orçamento</p>
                      <p className="text-lg font-bold text-ink">{formatCurrency(total)}</p>
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
                    <BotaoArquivar
                      projectId={project.id}
                      nome={project.name}
                      arquivado={project.archivedAt !== null}
                    />
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
