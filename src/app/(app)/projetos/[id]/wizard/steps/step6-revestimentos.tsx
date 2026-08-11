"use client";

import { useState, useTransition } from "react";
import { saveStep6Finishes } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PaintBucket, ChevronRight } from "lucide-react";
import {
  CARDINAL_WALL_SIDES, CARDINAL_WALL_LABELS, defaultWallLength,
} from "@/lib/wall-sides";
import type { CardinalWallSide } from "@/lib/wall-sides";

const FLOOR_OPTIONS = [
  { value: "ceramica", label: "Cerâmica" },
  { value: "porcelanato", label: "Porcelanato" },
  { value: "madeira", label: "Madeira / Laminado" },
  { value: "cimento_queimado", label: "Cimento Queimado" },
  { value: "nenhum", label: "Sem acabamento" },
];

// Azulejo de parede por cômodo. "Todas" usa o perímetro inteiro; "Escolher"
// grava só as paredes marcadas (RoomWallFinish), que é o que evita cobrar
// revestimento de parede que não vai ser revestida.
function RoomWallTile({ room, rf, suggested }: { room: any; rf: any; suggested: boolean }) {
  const cardinais = (room.wallFinishes ?? []).filter(
    (w: any) => w.hasTile && CARDINAL_WALL_SIDES.includes(w.wallSide)
  );
  // Paredes que vieram dos cards da Etapa 5 (box, pia) — a Etapa 6 não mexe.
  const especiais = (room.wallFinishes ?? []).filter(
    (w: any) => w.hasTile && !CARDINAL_WALL_SIDES.includes(w.wallSide)
  );

  const [mode, setMode] = useState<string>(
    cardinais.length > 0 ? "ESCOLHER" : (rf?.wallTile ?? suggested) ? "TODAS" : "NAO"
  );

  const byside: Record<string, any> = {};
  cardinais.forEach((w: any) => { byside[w.wallSide] = w; });

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Azulejo na parede</label>
          <select
            name={`wallTileMode_${room.id}`}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="NAO">Não tem</option>
            <option value="TODAS">Todas as paredes</option>
            <option value="ESCOLHER">Escolher paredes</option>
          </select>
        </div>
        {mode === "TODAS" && (
          <Input
            label="Altura do azulejo (m)"
            name={`wallTileHeight_${room.id}`}
            type="number"
            defaultValue={rf?.wallTileHeight ?? 1.5}
            step="0.1"
            min="0"
          />
        )}
      </div>

      {mode === "ESCOLHER" && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">
            Marque só as paredes revestidas. O comprimento vem das medidas do cômodo —
            altere se a parede revestida for menor (ex.: só o trecho da bancada).
          </p>
          <div className="flex flex-col gap-2">
            {CARDINAL_WALL_SIDES.map((side) => {
              const w = byside[side];
              const padrao = defaultWallLength(side as CardinalWallSide, room.width, room.length);
              return (
                <div key={side} className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center">
                  <label className="flex items-center gap-2 cursor-pointer w-28">
                    <input
                      type="checkbox"
                      name={`wall_${room.id}_${side}`}
                      value="true"
                      defaultChecked={!!w}
                      className="w-4 h-4 rounded accent-amber-600"
                    />
                    <span className="text-sm text-gray-700">
                      {CARDINAL_WALL_LABELS[side as CardinalWallSide]}
                    </span>
                  </label>
                  <Input
                    label="Compr. (m)"
                    name={`wallL_${room.id}_${side}`}
                    type="number"
                    defaultValue={w?.wallLength ?? padrao}
                    step="0.1"
                    min="0"
                  />
                  <Input
                    label="Altura (m)"
                    name={`wallH_${room.id}_${side}`}
                    type="number"
                    defaultValue={w?.tileHeight ?? rf?.wallTileHeight ?? 1.5}
                    step="0.1"
                    min="0"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {especiais.length > 0 && (
        <p className="text-xs text-blue-700 mt-2">
          Este ambiente também tem{" "}
          {especiais.map((w: any) => (w.wallSide === "BOX" ? "a área do box" : "a parede da pia")).join(" e ")}{" "}
          configurado na Etapa 5 — isso é somado e não é alterado aqui.
        </p>
      )}
    </div>
  );
}

export function Step6Revestimentos({ project }: { project: any }) {
  const [isPending, startTransition] = useTransition();
  const finishes = project.finishes;

  // Map existing roomFinishes by roomId
  const rfByRoom: Record<string, any> = {};
  (finishes?.roomFinishes ?? []).forEach((rf: any) => { rfByRoom[rf.roomId] = rf; });

  function handleSubmit(formData: FormData) {
    startTransition(() => saveStep6Finishes(project.id, formData));
  }

  function suggestWallTile(name: string) {
    const n = name.toLowerCase();
    return n.includes("banheiro") || n.includes("suíte") || n.includes("cozinha") || n.includes("área");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <PaintBucket className="w-4 h-4 text-amber-700" />
          </div>
          <CardTitle>Etapa 6 — Revestimentos e Esquadrias</CardTitle>
        </div>
        <CardDescription>
          Defina os acabamentos de piso/parede e conte portas e janelas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex flex-col gap-6">
          {/* Esquadrias */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3">Esquadrias</p>
            <div className="grid grid-cols-3 gap-4">
              <Input
                id="externalDoors"
                name="externalDoors"
                type="number"
                label="Portas externas"
                defaultValue={finishes?.externalDoors ?? 1}
                min="0"
              />
              <Input
                id="doors"
                name="doors"
                type="number"
                label="Portas internas"
                defaultValue={finishes?.doors ?? 0}
                min="0"
              />
              <Input
                id="windows"
                name="windows"
                type="number"
                label="Janelas"
                defaultValue={finishes?.windows ?? 0}
                min="0"
              />
            </div>
          </div>

          {/* Acabamento de parede antes da pintura */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Acabamento de parede (antes da pintura)</p>
            <p className="text-xs text-gray-500 mb-2">
              Vale para o projeto todo. Padrão econômico: só reboco e tinta.
            </p>
            <select
              name="wallFinishType"
              defaultValue={finishes?.wallFinishType ?? "SO_TINTA"}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="SO_TINTA">Só reboco + tinta (padrão econômico)</option>
              <option value="MASSA_TINTA">Reboco + massa corrida + tinta</option>
              <option value="GESSO_TINTA">Reboco + gesso liso + tinta</option>
            </select>
          </div>

          {/* Room finishes */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3">Acabamentos por Cômodo</p>
            {project.rooms.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                Adicione os ambientes na etapa 2 primeiro.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {project.rooms.map((room: any) => {
                  const rf = rfByRoom[room.id];
                  const hasWallTile = rf?.wallTile ?? suggestWallTile(room.name);
                  return (
                    <div
                      key={room.id}
                      className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <p className="font-medium text-gray-900 mb-3">{room.name}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-start">
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Piso</label>
                          <select
                            name={`floorType_${room.id}`}
                            defaultValue={rf?.floorType ?? "ceramica"}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            {FLOOR_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-600">Pintura?</label>
                          <select
                            name={`paintWalls_${room.id}`}
                            defaultValue={rf?.paintWalls !== false ? "true" : "false"}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                          </select>
                        </div>
                      </div>
                      <RoomWallTile room={room} rf={rf} suggested={hasWallTile} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Próxima etapa — Revisão"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
