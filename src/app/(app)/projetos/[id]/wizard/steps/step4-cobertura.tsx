"use client";

import { useTransition, useState } from "react";
import { saveStep4Roofing } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Triangle, ChevronRight } from "lucide-react";

export function Step4Cobertura({ project }: { project: any }) {
  const [isPending, startTransition] = useTransition();
  const r = project.roofing;
  const [hasRoof, setHasRoof] = useState(r?.hasRoof !== false);

  function handleSubmit(formData: FormData) {
    formData.set("hasRoof", hasRoof ? "true" : "false");
    startTransition(() => saveStep4Roofing(project.id, formData));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Triangle className="w-4 h-4 text-amber-700" />
          </div>
          <CardTitle>Etapa 4 — Cobertura</CardTitle>
        </div>
        <CardDescription>Configure o sistema de cobertura da construção.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="hasRoofCheck"
              checked={hasRoof}
              onChange={(e) => setHasRoof(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-600"
            />
            <label htmlFor="hasRoofCheck" className="text-sm font-medium text-gray-700">
              A obra possui telhado inclinado
            </label>
          </div>

          {hasRoof && (
            <>
              <Select
                id="roofType"
                name="roofType"
                label="Tipo de telhado"
                defaultValue={r?.roofType ?? "duas_aguas"}
                options={[
                  { value: "uma_agua", label: "Uma água" },
                  { value: "duas_aguas", label: "Duas águas" },
                  { value: "quatro_aguas", label: "Quatro águas" },
                  { value: "shed", label: "Shed / Dente de Serra" },
                ]}
              />
              <Select
                id="tileType"
                name="tileType"
                label="Tipo de telha"
                defaultValue={r?.tileType ?? "ceramica"}
                options={[
                  { value: "ceramica", label: "Cerâmica (colonial, portuguesa)" },
                  { value: "fibrocimento", label: "Fibrocimento (Eternit)" },
                  { value: "metalica", label: "Metálica (galvalume, aço)" },
                  { value: "concreto", label: "Concreto" },
                ]}
              />
              <Input
                id="inclination"
                name="inclination"
                type="number"
                label="Inclinação do telhado (%)"
                defaultValue={r?.inclination ?? 30}
                min="10"
                max="60"
                step="5"
              />
            </>
          )}

          {!hasRoof && (
            <Select
              id="roofType"
              name="roofType"
              label="Tipo de cobertura"
              defaultValue="laje_impermeabilizada"
              options={[
                { value: "laje_impermeabilizada", label: "Laje impermeabilizada" },
              ]}
            />
          )}

          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Próxima etapa — Instalações"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
