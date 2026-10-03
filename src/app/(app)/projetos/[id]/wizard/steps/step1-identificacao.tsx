"use client";

import { useTransition } from "react";
import { saveStep1Identification } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, ChevronRight } from "lucide-react";

export function Step1Identificacao({ project }: { project: any }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(() => saveStep1Identification(project.id, formData));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-amber-700" />
          </div>
          <CardTitle>Etapa 1 — Identificação do Projeto</CardTitle>
        </div>
        <CardDescription>
          Corrija aqui qualquer dado do projeto ou do cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="name"
              name="name"
              label="Nome do projeto"
              defaultValue={project.name ?? ""}
              required
              minLength={2}
            />
            <Select
              id="type"
              name="type"
              label="Tipo de obra"
              defaultValue={project.type ?? "NOVA_CONSTRUCAO"}
              options={[
                { value: "NOVA_CONSTRUCAO", label: "Nova Construção" },
                { value: "REFORMA", label: "Reforma" },
                { value: "AMPLIACAO", label: "Ampliação" },
              ]}
            />
          </div>

          {/* Cliente */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-zinc-700">Cliente</p>
            <Input
              id="clientName"
              name="clientName"
              label="Nome do cliente"
              defaultValue={project.clientName ?? ""}
              required
              minLength={2}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="clientPhone"
                name="clientPhone"
                label="Telefone"
                defaultValue={project.clientPhone ?? ""}
              />
              <Input
                id="clientEmail"
                name="clientEmail"
                type="email"
                label="E-mail"
                defaultValue={project.clientEmail ?? ""}
              />
            </div>
          </div>

          {/* Local da obra */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-zinc-700">Local da obra</p>
            <Input
              id="address"
              name="address"
              label="Endereço"
              defaultValue={project.address ?? ""}
            />
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  id="city"
                  name="city"
                  label="Cidade"
                  defaultValue={project.city ?? ""}
                />
              </div>
              <Input
                id="state"
                name="state"
                label="Estado"
                defaultValue={project.state ?? ""}
                maxLength={2}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Observações
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={project.notes ?? ""}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Próxima etapa — Ambientes"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
