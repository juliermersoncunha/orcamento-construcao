"use client";

import { useActionState } from "react";
import { createProject, type ProjectFormState } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const initialState: ProjectFormState = {};

const tipoOptions = [
  { value: "NOVA_CONSTRUCAO", label: "Nova Construção" },
  { value: "REFORMA", label: "Reforma" },
  { value: "AMPLIACAO", label: "Ampliação" },
];

export default function NovoProjetoPage() {
  const [state, formAction, isPending] = useActionState(createProject, initialState);

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/projetos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Projeto</h1>
          <p className="text-sm text-gray-500">Preencha as informações básicas do projeto</p>
        </div>
      </div>

      <form action={formAction}>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                id="name"
                name="name"
                label="Nome do projeto *"
                placeholder="Ex: Residência Família Silva"
                error={state.errors?.name?.[0]}
                required
              />
              <Select
                id="type"
                name="type"
                label="Tipo de obra *"
                options={tipoOptions}
                error={state.errors?.type?.[0]}
              />
              <Input
                id="notes"
                name="notes"
                label="Observações"
                placeholder="Informações adicionais sobre o projeto..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                id="clientName"
                name="clientName"
                label="Nome do cliente *"
                placeholder="Nome completo"
                error={state.errors?.clientName?.[0]}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="clientPhone"
                  name="clientPhone"
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  type="tel"
                />
                <Input
                  id="clientEmail"
                  name="clientEmail"
                  label="E-mail"
                  placeholder="cliente@email.com"
                  type="email"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Localização</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                id="address"
                name="address"
                label="Endereço"
                placeholder="Rua, número, bairro"
              />
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Input id="city" name="city" label="Cidade" placeholder="São Paulo" />
                </div>
                <Input id="state" name="state" label="Estado" placeholder="SP" maxLength={2} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Link href="/projetos">
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando..." : "Criar e Iniciar Orçamento →"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
