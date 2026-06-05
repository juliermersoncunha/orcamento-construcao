"use client";

import { useTransition } from "react";
import { saveStep5Installations } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap, ChevronRight } from "lucide-react";

export function Step5Instalacoes({ project }: { project: any }) {
  const [isPending, startTransition] = useTransition();
  const inst = project.installations;

  // Map existing electrical/hydraulic points by roomId
  const epByRoom: Record<string, any> = {};
  const hpByRoom: Record<string, any> = {};
  (inst?.electricalPoints ?? []).forEach((ep: any) => { epByRoom[ep.roomId] = ep; });
  (inst?.hydraulicPoints ?? []).forEach((hp: any) => { hpByRoom[hp.roomId] = hp; });

  function handleSubmit(formData: FormData) {
    startTransition(() => saveStep5Installations(project.id, formData));
  }

  // Suggest defaults by room name
  function suggestOutlets(name: string) {
    const n = name.toLowerCase();
    if (n.includes("cozinha")) return 6;
    if (n.includes("sala")) return 4;
    if (n.includes("quarto") || n.includes("suíte")) return 4;
    if (n.includes("banheiro")) return 2;
    if (n.includes("garagem")) return 2;
    return 2;
  }

  function suggestWater(name: string) {
    const n = name.toLowerCase();
    if (n.includes("banheiro") || n.includes("suíte")) return 2;
    if (n.includes("cozinha")) return 1;
    if (n.includes("área") || n.includes("lavanderia")) return 1;
    return 0;
  }

  function suggestDrain(name: string) {
    return suggestWater(name);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-700" />
          </div>
          <CardTitle>Etapa 5 — Instalações</CardTitle>
        </div>
        <CardDescription>
          Configure os pontos elétricos e hidráulicos por cômodo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit}>
          <Select
            id="heatingType"
            name="heatingType"
            label="Tipo de aquecimento de água"
            defaultValue={inst?.heatingType ?? "eletrico"}
            options={[
              { value: "eletrico", label: "Elétrico (chuveiro)" },
              { value: "solar", label: "Solar" },
              { value: "gas", label: "A gás (aquecedor)" },
            ]}
            className="mb-6"
          />

          {project.rooms.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              Adicione os ambientes na etapa 2 primeiro.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left font-medium text-gray-500 py-2 pr-4">Cômodo</th>
                    <th className="text-center font-medium text-gray-500 py-2 px-2">Tomadas</th>
                    <th className="text-center font-medium text-gray-500 py-2 px-2">Interruptores</th>
                    <th className="text-center font-medium text-gray-500 py-2 px-2">Pontos luz</th>
                    <th className="text-center font-medium text-gray-500 py-2 px-2">Água</th>
                    <th className="text-center font-medium text-gray-500 py-2 px-2">Esgoto</th>
                  </tr>
                </thead>
                <tbody>
                  {project.rooms.map((room: any) => {
                    const ep = epByRoom[room.id];
                    const hp = hpByRoom[room.id];
                    return (
                      <tr key={room.id} className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-medium text-gray-800">{room.name}</td>
                        {[
                          { name: `outlets_${room.id}`, def: ep?.outlets ?? suggestOutlets(room.name) },
                          { name: `switches_${room.id}`, def: ep?.switches ?? 1 },
                          { name: `lightPoints_${room.id}`, def: ep?.lightPoints ?? 1 },
                          { name: `waterInlets_${room.id}`, def: hp?.waterInlets ?? suggestWater(room.name) },
                          { name: `drainPoints_${room.id}`, def: hp?.drainPoints ?? suggestDrain(room.name) },
                        ].map(({ name, def }) => (
                          <td key={name} className="py-2 px-2 text-center">
                            <input
                              type="number"
                              name={name}
                              defaultValue={def}
                              min="0"
                              max="20"
                              className="w-14 text-center rounded border border-gray-300 px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Próxima etapa — Revestimentos"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
