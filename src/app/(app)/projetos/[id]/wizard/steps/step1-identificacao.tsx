"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, ChevronRight } from "lucide-react";

const typeLabel = {
  NOVA_CONSTRUCAO: "Nova Construção",
  REFORMA: "Reforma",
  AMPLIACAO: "Ampliação",
};

export function Step1Identificacao({ project }: { project: any }) {
  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-amber-700" />
            </div>
            <CardTitle>Etapa 1 — Identificação do Projeto</CardTitle>
          </div>
          <CardDescription>Revise as informações cadastradas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Nome do projeto</p>
              <p className="font-medium text-gray-900">{project.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Tipo de obra</p>
              <p className="font-medium text-gray-900">{typeLabel[project.type as keyof typeof typeLabel]}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Cliente</p>
              <p className="font-medium text-gray-900">{project.clientName}</p>
            </div>
            {project.city && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Cidade</p>
                <p className="font-medium text-gray-900">
                  {project.city}{project.state ? `, ${project.state}` : ""}
                </p>
              </div>
            )}
            {project.notes && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-0.5">Observações</p>
                <p className="text-gray-700">{project.notes}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <Link href={`/projetos/${project.id}/wizard?etapa=2`}>
              <Button>
                Próxima etapa — Ambientes
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
