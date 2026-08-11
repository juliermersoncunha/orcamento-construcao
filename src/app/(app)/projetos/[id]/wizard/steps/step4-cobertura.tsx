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
  const [tileType, setTileType] = useState<string>(r?.tileType ?? "ceramica");

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
                value={tileType}
                onChange={(e) => setTileType(e.target.value)}
                options={[
                  { value: "ceramica", label: "Cerâmica (colonial, portuguesa)" },
                  { value: "fibrocimento", label: "Fibrocimento (Eternit)" },
                  { value: "metalica", label: "Metálica (galvalume, aço)" },
                  { value: "concreto", label: "Concreto" },
                ]}
              />
              {tileType === "fibrocimento" && (
                <Select
                  id="tileSize"
                  name="tileSize"
                  label="Tamanho da telha (m)"
                  defaultValue={r?.tileSize ?? "2,44 x 1,1"}
                  options={[
                    { value: "2,44 x 1,1", label: "2,44 × 1,10" },
                    { value: "1,83 x 1,1", label: "1,83 × 1,10" },
                  ]}
                />
              )}
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

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-700 mb-1">Madeiramento</p>
                <p className="text-xs text-zinc-500 mb-3">
                  Informe a metragem que você levantou. O que ficar em 0 não entra no
                  orçamento — o sistema não estima madeiramento.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="caibroM"
                    name="caibroM"
                    type="number"
                    label="Caibro 5×7cm (m)"
                    defaultValue={r?.caibroM ?? 0}
                    min="0"
                    step="0.1"
                  />
                  <Input
                    id="ripaM"
                    name="ripaM"
                    type="number"
                    label="Ripa 2,5×5cm (m)"
                    defaultValue={r?.ripaM ?? 0}
                    min="0"
                    step="0.1"
                  />
                  <Input
                    id="linhaM"
                    name="linhaM"
                    type="number"
                    label="Linha 6×12cm (m)"
                    defaultValue={r?.linhaM ?? 0}
                    min="0"
                    step="0.1"
                  />
                  <Input
                    id="barroteM"
                    name="barroteM"
                    type="number"
                    label="Barrote 6×6cm (m)"
                    defaultValue={r?.barroteM ?? 0}
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
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
