"use client";

import { useTransition } from "react";
import { saveStep3Structure } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layers, ChevronRight } from "lucide-react";

export function Step3Estrutura({ project }: { project: any }) {
  const [isPending, startTransition] = useTransition();
  const s = project.structure;

  function handleSubmit(formData: FormData) {
    startTransition(() => saveStep3Structure(project.id, formData));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Layers className="w-4 h-4 text-amber-700" />
          </div>
          <CardTitle>Etapa 3 — Estrutura e Alvenaria</CardTitle>
        </div>
        <CardDescription>Defina o sistema construtivo da obra.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <Select
            id="foundationType"
            name="foundationType"
            label="Tipo de fundação"
            defaultValue={s?.foundationType ?? "sapata_corrida"}
            options={[
              { value: "radier", label: "Radier" },
              { value: "sapata_corrida", label: "Sapata Corrida" },
              { value: "sapata_isolada", label: "Sapata Isolada" },
              { value: "estaca", label: "Estaca (tubulão/hélice)" },
            ]}
          />
          <Select
            id="structureType"
            name="structureType"
            label="Tipo de estrutura"
            defaultValue={s?.structureType ?? "concreto_armado"}
            options={[
              { value: "concreto_armado", label: "Concreto Armado" },
              { value: "metalica", label: "Estrutura Metálica" },
              { value: "madeira", label: "Madeira (Wood Frame)" },
            ]}
          />
          <Select
            id="blockType"
            name="blockType"
            label="Tipo de bloco para alvenaria"
            defaultValue={s?.blockType ?? "tijolo_furado"}
            options={[
              { value: "tijolo_furado", label: "Tijolo Cerâmico Furado 9x19x19" },
              { value: "bloco_concreto", label: "Bloco de Concreto" },
              { value: "bloco_celular", label: "Bloco de Concreto Celular (BCC)" },
            ]}
          />
          <Input
            id="floors"
            name="floors"
            type="number"
            label="Número de pavimentos"
            defaultValue={s?.floors ?? 1}
            min="1"
            max="10"
          />

          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-700">Elementos estruturais adicionais</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="hasLaje"
                value="true"
                defaultChecked={s?.hasLaje ?? false}
                className="w-4 h-4 rounded accent-amber-600"
              />
              <span className="text-sm text-zinc-700">Possui laje (laje pré-moldada ou moldada in loco)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="hasEscada"
                value="true"
                defaultChecked={s?.hasEscada ?? false}
                className="w-4 h-4 rounded accent-amber-600"
              />
              <span className="text-sm text-zinc-700">Possui escada (para edificações com 2+ pavimentos)</span>
            </label>
          </div>

          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Próxima etapa — Cobertura"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
