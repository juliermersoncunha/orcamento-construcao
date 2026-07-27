"use client";

import { useTransition } from "react";
import { saveStep5Installations } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap, ChevronRight, Bath, ChefHat } from "lucide-react";
import { BathroomCard } from "./step5-bathroom-card";
import { KitchenCard } from "./step5-kitchen-card";
import { Step5ManualPipes, type PipeMaterial } from "./step5-manual-pipes";
import { BATHROOM_ROOM_TYPE_SET } from "@/lib/fixture-library/bathroom";
import { KITCHEN_ROOM_TYPE_SET } from "@/lib/fixture-library/kitchen";

type Step5Props = {
  project: any;
  pipesByName: Record<string, PipeMaterial>;
  manualPipeQuantities: Record<string, number>;
};

export function Step5Instalacoes({ project, pipesByName, manualPipeQuantities }: Step5Props) {
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

  // A room is a bathroom if its roomType is a bathroom type, or (for rooms not yet
  // typed) its name matches banheiro/lavabo/wc.
  function isBathroom(room: any) {
    if (room.roomType && BATHROOM_ROOM_TYPE_SET.has(room.roomType)) return true;
    if (room.roomType) return false; // typed as non-bathroom
    const n = (room.name ?? "").toLowerCase();
    return n.includes("banheiro") || n.includes("lavabo") || n.includes("wc");
  }

  const bathrooms = (project.rooms ?? []).filter(isBathroom);

  function isKitchen(room: any) {
    if (room.roomType && KITCHEN_ROOM_TYPE_SET.has(room.roomType)) return true;
    if (room.roomType) return false;
    const n = (room.name ?? "").toLowerCase();
    return n.includes("cozinha") || n.includes("copa");
  }
  const kitchens = (project.rooms ?? []).filter(isKitchen);

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
    <>
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
            className="mb-4"
          />

          {/* Padrão global de acabamento elétrico. Cada ponto declarado abaixo
              (tomada / interruptor / luz) usa esta escolha para o material. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Select
              id="outletType"
              name="outletType"
              label="Tomada padrão"
              defaultValue={inst?.outletType ?? "SIMPLES"}
              options={[
                { value: "SIMPLES", label: "Simples (2P+T 10A)" },
                { value: "DUPLA",   label: "Dupla (conjunto 2 tomadas)" },
                { value: "TRIPLA",  label: "Tripla (conjunto 3 tomadas)" },
              ]}
            />
            <Select
              id="switchType"
              name="switchType"
              label="Interruptor padrão"
              defaultValue={inst?.switchType ?? "SIMPLES"}
              options={[
                { value: "SIMPLES", label: "Simples (1 tecla)" },
                { value: "DUPLO",   label: "Duplo (2 teclas)" },
                { value: "TRIPLO",  label: "Triplo (3 teclas)" },
              ]}
            />
            <Select
              id="lightPointType"
              name="lightPointType"
              label="Ponto de luz padrão"
              defaultValue={inst?.lightPointType ?? "PLAFON_LED"}
              options={[
                { value: "PLAFON_LED",          label: "Plafon LED integrado" },
                { value: "RECEPTACULO_LAMPADA", label: "Receptáculo E-27 + lâmpada LED 9W" },
              ]}
            />
          </div>

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

        {/* Equipamentos por ambiente — banheiros */}
        {bathrooms.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Bath className="w-4 h-4 text-blue-700" />
              <h3 className="text-base font-semibold text-gray-900">Equipamentos por ambiente</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Configure os equipamentos de cada banheiro. Os materiais, acessórios e pontos são gerados
              automaticamente e alimentam o orçamento. Cada banheiro é salvo individualmente.
            </p>
            {bathrooms.map((room: any) => (
              <BathroomCard key={room.id} room={room} />
            ))}
          </div>
        )}

        {/* Equipamentos por ambiente — cozinhas */}
        {kitchens.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <ChefHat className="w-4 h-4 text-orange-700" />
              <h3 className="text-base font-semibold text-gray-900">Cozinha padrão econômica</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Configure a pia, torneira e itens opcionais. Tubos e conexões continuam
              informados manualmente na seção abaixo.
            </p>
            {kitchens.map((room: any) => (
              <KitchenCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </CardContent>
      </Card>

      <div className="mt-6">
        <Step5ManualPipes
          projectId={project.id}
          materialsByName={pipesByName}
          initialQuantities={manualPipeQuantities}
        />
      </div>
    </>
  );
}
