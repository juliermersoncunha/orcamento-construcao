"use client";

import { useState, useTransition } from "react";
import { saveStep3Structure } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layers, ChevronRight } from "lucide-react";

export function Step3Estrutura({ project }: { project: any }) {
  const [isPending, startTransition] = useTransition();
  const s = project.structure;
  const [hasPlatibanda, setHasPlatibanda] = useState<boolean>(s?.hasPlatibanda ?? false);
  const [hasLaje, setHasLaje] = useState<boolean>(s?.hasLaje ?? false);

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
        <CardDescription>Defina o sistema construtivo e as dimensões dos elementos estruturais.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Terraplenagem */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-700 mb-3">Terraplenagem</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="escavacaoM3"
                name="escavacaoM3"
                type="number"
                label="Escavação (m³)"
                defaultValue={s?.escavacaoM3 ?? 0}
                min="0"
                step="0.1"
              />
              <Input
                id="compactacaoM2"
                name="compactacaoM2"
                type="number"
                label="Compactação de aterro (m²)"
                defaultValue={s?.compactacaoM2 ?? 0}
                min="0"
                step="0.1"
              />
            </div>
          </div>

          {/* Alvenaria — perímetros manuais */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-700 mb-1">Alvenaria (paredes)</p>
            <p className="text-xs text-zinc-500 mb-3">
              Informe o perímetro das paredes (cada parede interna conta uma vez, sem duplicar).
              Portas e janelas da Etapa 6 são descontadas automaticamente.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                id="perimetroParedesExt"
                name="perimetroParedesExt"
                type="number"
                label="Perímetro externo (m)"
                defaultValue={s?.perimetroParedesExt ?? 0}
                min="0"
                step="0.1"
              />
              <Input
                id="perimetroParedesInt"
                name="perimetroParedesInt"
                type="number"
                label="Paredes internas (m)"
                defaultValue={s?.perimetroParedesInt ?? 0}
                min="0"
                step="0.1"
              />
              <Input
                id="peDireito"
                name="peDireito"
                type="number"
                label="Pé-direito (m)"
                defaultValue={s?.peDireito ?? 2.8}
                min="0"
                step="0.05"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer mt-4">
              <input
                type="checkbox"
                name="hasPlatibanda"
                value="true"
                checked={hasPlatibanda}
                onChange={(e) => setHasPlatibanda(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-600"
              />
              <span className="text-sm text-zinc-700">Possui platibanda (mureta acima do pé-direito)</span>
            </label>
            {hasPlatibanda && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input
                  id="platibandaML"
                  name="platibandaML"
                  type="number"
                  label="Platibanda — metros lineares (m)"
                  defaultValue={s?.platibandaML ?? 0}
                  min="0"
                  step="0.1"
                />
                <Input
                  id="platibandaAltura"
                  name="platibandaAltura"
                  type="number"
                  label="Platibanda — altura (m)"
                  defaultValue={s?.platibandaAltura ?? 0}
                  min="0"
                  step="0.05"
                />
              </div>
            )}
          </div>

          {/* Sapatas */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-700 mb-3">Sapatas</p>
            <div className="grid grid-cols-4 gap-3">
              <Input
                id="sapataQtd"
                name="sapataQtd"
                type="number"
                label="Quantidade"
                defaultValue={s?.sapataQtd ?? 0}
                min="0"
                step="1"
              />
              <Input
                id="sapataLargura"
                name="sapataLargura"
                type="number"
                label="Largura (m)"
                defaultValue={s?.sapataLargura ?? 0.6}
                min="0"
                step="0.05"
              />
              <Input
                id="sapataCompr"
                name="sapataCompr"
                type="number"
                label="Comprimento (m)"
                defaultValue={s?.sapataCompr ?? 0.6}
                min="0"
                step="0.05"
              />
              <Input
                id="sapataAltura"
                name="sapataAltura"
                type="number"
                label="Altura (m)"
                defaultValue={s?.sapataAltura ?? 0.3}
                min="0"
                step="0.05"
              />
            </div>
          </div>

          {/* Pilares */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-700 mb-3">Pilares</p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                id="pilarMetros"
                name="pilarMetros"
                type="number"
                label="Metros lineares totais"
                defaultValue={s?.pilarMetros ?? 0}
                min="0"
                step="0.1"
              />
              <Input
                id="pilarLargura"
                name="pilarLargura"
                type="number"
                label="Seção — Largura (m)"
                defaultValue={s?.pilarLargura ?? 0.15}
                min="0"
                step="0.01"
              />
              <Input
                id="pilarAltura"
                name="pilarAltura"
                type="number"
                label="Seção — Altura (m)"
                defaultValue={s?.pilarAltura ?? 0.3}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Vigas */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-700 mb-3">Vigas</p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                id="vigaMetros"
                name="vigaMetros"
                type="number"
                label="Metros lineares totais"
                defaultValue={s?.vigaMetros ?? 0}
                min="0"
                step="0.1"
              />
              <Input
                id="vigaLargura"
                name="vigaLargura"
                type="number"
                label="Seção — Largura (m)"
                defaultValue={s?.vigaLargura ?? 0.15}
                min="0"
                step="0.01"
              />
              <Input
                id="vigaAltura"
                name="vigaAltura"
                type="number"
                label="Seção — Altura (m)"
                defaultValue={s?.vigaAltura ?? 0.4}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-700">Elementos estruturais adicionais</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="hasLaje"
                value="true"
                checked={hasLaje}
                onChange={(e) => setHasLaje(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-600"
              />
              <span className="text-sm text-zinc-700">Possui laje pré-moldada/treliçada</span>
            </label>
            {hasLaje && (
              <div className="ml-7">
                <Select
                  id="lajeType"
                  name="lajeType"
                  label="Tipo de laje"
                  defaultValue={s?.lajeType ?? "forro"}
                  options={[
                    { value: "forro", label: "Forro (0,14 m³ de concreto/m²)" },
                    { value: "piso", label: "Piso (0,11 m³ de concreto/m²)" },
                  ]}
                />
              </div>
            )}
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
            <div className="pt-1">
              <Input
                id="formasM2"
                name="formasM2"
                type="number"
                label="Fôrmas de madeira — total (m²) · 0 = calcular automático"
                defaultValue={s?.formasM2 ?? 0}
                min="0"
                step="0.1"
              />
            </div>
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
