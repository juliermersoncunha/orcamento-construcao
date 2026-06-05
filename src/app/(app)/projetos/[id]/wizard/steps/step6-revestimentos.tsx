"use client";

import { useTransition } from "react";
import { saveStep6Finishes } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PaintBucket, ChevronRight } from "lucide-react";

const FLOOR_OPTIONS = [
  { value: "ceramica", label: "Cerâmica" },
  { value: "porcelanato", label: "Porcelanato" },
  { value: "madeira", label: "Madeira / Laminado" },
  { value: "cimento_queimado", label: "Cimento Queimado" },
  { value: "nenhum", label: "Sem acabamento" },
];

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
                          <label className="text-xs font-medium text-gray-600">Azulejo na parede?</label>
                          <select
                            name={`wallTile_${room.id}`}
                            defaultValue={hasWallTile ? "true" : "false"}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                          </select>
                        </div>
                        <Input
                          label="Altura azulejo (m)"
                          name={`wallTileHeight_${room.id}`}
                          type="number"
                          defaultValue={rf?.wallTileHeight ?? 1.5}
                          step="0.1"
                          min="0"
                        />
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
