"use client";

import { useState, useTransition } from "react";
import { saveStep7Walls } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Fence, ArrowRight } from "lucide-react";

type Side = "FRONT" | "BACK" | "LEFT" | "RIGHT";

const SIDE_LABELS: Record<Side, { label: string; desc: string }> = {
  FRONT: { label: "Muro Frontal", desc: "Frente do terreno (rua)" },
  BACK: { label: "Muro Traseiro", desc: "Fundo do terreno" },
  LEFT: { label: "Muro Lateral Esquerdo", desc: "Divisa esquerda" },
  RIGHT: { label: "Muro Lateral Direito", desc: "Divisa direita" },
};

const SIDES: Side[] = ["FRONT", "BACK", "LEFT", "RIGHT"];

type WallState = {
  hasWall: boolean;
  length: number;
  height: number;
};

type ExistingWall = {
  side: string;
  hasWall: boolean;
  length: number;
  height: number;
};

export function Step7Muros({ project }: { project: any }) {
  const [isPending, startTransition] = useTransition();

  const initial: Record<Side, WallState> = {} as Record<Side, WallState>;
  for (const side of SIDES) {
    const existing: ExistingWall | undefined = project.walls?.find((w: ExistingWall) => w.side === side);
    initial[side] = {
      hasWall: existing?.hasWall ?? false,
      length: existing?.length ?? 0,
      height: existing?.height ?? 2.0,
    };
  }

  const [walls, setWalls] = useState(initial);

  function update(side: Side, field: keyof WallState, value: boolean | number) {
    setWalls((prev) => ({ ...prev, [side]: { ...prev[side], [field]: value } }));
  }

  const totalWallArea = SIDES.filter((s) => walls[s].hasWall).reduce(
    (sum, s) => sum + walls[s].length * walls[s].height,
    0
  );

  function handleSubmit() {
    const fd = new FormData();
    for (const side of SIDES) {
      fd.append(`hasWall_${side}`, walls[side].hasWall ? "true" : "false");
      fd.append(`length_${side}`, String(walls[side].length));
      fd.append(`height_${side}`, String(walls[side].height));
    }
    startTransition(() => saveStep7Walls(project.id, fd));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Fence className="w-4 h-4 text-amber-700" />
          </div>
          <CardTitle>Etapa 7 — Muros e Cercas</CardTitle>
        </div>
        <CardDescription>
          Informe quais lados do terreno terão muro de alvenaria e as dimensões.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-8">
          {SIDES.map((side) => {
            const { label, desc } = SIDE_LABELS[side];
            const w = walls[side];
            return (
              <div
                key={side}
                className={`rounded-xl border-2 p-4 transition-colors ${
                  w.hasWall ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={w.hasWall}
                      onChange={(e) => update(side, "hasWall", e.target.checked)}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span className="text-sm text-gray-700">Tem muro</span>
                  </label>
                </div>

                {w.hasWall && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Comprimento (m)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={w.length || ""}
                        onChange={(e) => update(side, "length", parseFloat(e.target.value) || 0)}
                        placeholder="Ex: 12.5"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Altura (m)
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        max="5"
                        step="0.1"
                        value={w.height || ""}
                        onChange={(e) => update(side, "height", parseFloat(e.target.value) || 2.0)}
                        placeholder="2.0"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {totalWallArea > 0 && (
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Área total de muro: <strong>{totalWallArea.toFixed(1)} m²</strong>
            {" "}(todos os lados selecionados)
          </div>
        )}

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => startTransition(() => saveStep7Walls(project.id, new FormData()))}
            disabled={isPending}
          >
            Pular (sem muros)
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : "Continuar"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
