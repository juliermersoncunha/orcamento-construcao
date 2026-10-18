"use client";

import { useState } from "react";
import { saveStep2Rooms } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutGrid, Plus, Trash2, ChevronRight } from "lucide-react";

type Room = {
  id: string; name: string; width: string; length: string; height: string;
  doors: string; doorWidth: string; doorHeight: string;
  windows: string; windowWidth: string; windowHeight: string;
};

const VAOS_PADRAO = { doors: "0", doorWidth: "0.80", doorHeight: "2.10", windows: "0", windowWidth: "1.20", windowHeight: "1.20" };

const ROOM_PRESETS = [
  "Quarto",
  "Suíte",
  "Sala de Estar",
  "Sala de Jantar",
  "Cozinha",
  "Banheiro",
  "Área de Serviço",
  "Garagem",
  "Varanda",
  "Escritório",
];

let roomCounter = 0;
const newRoom = (name = ""): Room => ({
  id: `room-${++roomCounter}`,
  name,
  width: "",
  length: "",
  height: "2.80",
  ...VAOS_PADRAO,
});

export function Step2Ambientes({ project }: { project: any }) {
  const [rooms, setRooms] = useState<Room[]>(
    project.rooms.length > 0
      ? project.rooms.map((r: any) => ({
          id: r.id,
          name: r.name,
          width: String(r.width),
          length: String(r.length),
          height: String(r.height),
          doors: String(r.doors ?? 0),
          doorWidth: String(r.doorWidth ?? 0.8),
          doorHeight: String(r.doorHeight ?? 2.1),
          windows: String(r.windows ?? 0),
          windowWidth: String(r.windowWidth ?? 1.2),
          windowHeight: String(r.windowHeight ?? 1.2),
        }))
      : [newRoom()]
  );
  const [isPending, setIsPending] = useState(false);

  function addRoom(name = "") {
    setRooms((prev) => [...prev, newRoom(name)]);
  }

  function removeRoom(id: string) {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRoom(id: string, field: keyof Room, value: string) {
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function totalArea() {
    return rooms.reduce((sum, r) => {
      const w = parseFloat(r.width) || 0;
      const l = parseFloat(r.length) || 0;
      return sum + w * l;
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData();
    rooms.forEach((r) => {
      formData.append("roomId", r.id);
      formData.append("roomName", r.name);
      formData.append("roomWidth", r.width);
      formData.append("roomLength", r.length);
      formData.append("roomHeight", r.height);
      formData.append("roomDoors", r.doors);
      formData.append("roomDoorWidth", r.doorWidth);
      formData.append("roomDoorHeight", r.doorHeight);
      formData.append("roomWindows", r.windows);
      formData.append("roomWindowWidth", r.windowWidth);
      formData.append("roomWindowHeight", r.windowHeight);
    });
    await saveStep2Rooms(project.id, formData);
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-amber-700" />
            </div>
            <CardTitle>Etapa 2 — Ambientes e Áreas</CardTitle>
          </div>
          <CardDescription>
            Informe os cômodos, suas dimensões e as portas e janelas de cada um. A área é calculada
            automaticamente, e os vãos são descontados das paredes no cálculo de material.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Presets */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-600 mb-2">Adicionar cômodo rápido:</p>
            <div className="flex flex-wrap gap-2">
              {ROOM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addRoom(preset)}
                  className="text-xs px-3 py-1.5 rounded-full border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Header row */}
            <div className="grid grid-cols-[1fr_80px_80px_80px_80px_40px] gap-2 mb-2 px-1">
              <p className="text-xs font-medium text-gray-500">Cômodo</p>
              <p className="text-xs font-medium text-gray-500 text-center">Larg. (m)</p>
              <p className="text-xs font-medium text-gray-500 text-center">Comp. (m)</p>
              <p className="text-xs font-medium text-gray-500 text-center">Pé dir. (m)</p>
              <p className="text-xs font-medium text-gray-500 text-center">Área (m²)</p>
              <div />
            </div>

            <div className="flex flex-col gap-2 mb-4">
              {rooms.map((room) => {
                const area = (parseFloat(room.width) || 0) * (parseFloat(room.length) || 0);
                const n = (v: string) => parseFloat(v) || 0;
                const vaos = n(room.doors) * n(room.doorWidth) * n(room.doorHeight)
                  + n(room.windows) * n(room.windowWidth) * n(room.windowHeight);
                return (
                  <div key={room.id} className="rounded-md border border-gray-100 p-2">
                  <div className="grid grid-cols-[1fr_80px_80px_80px_80px_40px] gap-2 items-center">
                    <input
                      value={room.name}
                      onChange={(e) => updateRoom(room.id, "name", e.target.value)}
                      placeholder="Nome do cômodo"
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <input
                      type="number"
                      value={room.width}
                      onChange={(e) => updateRoom(room.id, "width", e.target.value)}
                      placeholder="0,00"
                      step="any"
                      min="0"
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <input
                      type="number"
                      value={room.length}
                      onChange={(e) => updateRoom(room.id, "length", e.target.value)}
                      placeholder="0,00"
                      step="any"
                      min="0"
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <input
                      type="number"
                      value={room.height}
                      onChange={(e) => updateRoom(room.id, "height", e.target.value)}
                      placeholder="2,80"
                      step="any"
                      min="0"
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <div className="flex items-center justify-center">
                      <span className="text-sm font-medium text-amber-700">
                        {area > 0 ? area.toFixed(2) : "—"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRoom(room.id)}
                      disabled={rooms.length === 1}
                      className="flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                    <VaoInput
                      rotulo="Portas"
                      qtd={room.doors} largura={room.doorWidth} altura={room.doorHeight}
                      onQtd={(v) => updateRoom(room.id, "doors", v)}
                      onLargura={(v) => updateRoom(room.id, "doorWidth", v)}
                      onAltura={(v) => updateRoom(room.id, "doorHeight", v)}
                    />
                    <VaoInput
                      rotulo="Janelas"
                      qtd={room.windows} largura={room.windowWidth} altura={room.windowHeight}
                      onQtd={(v) => updateRoom(room.id, "windows", v)}
                      onLargura={(v) => updateRoom(room.id, "windowWidth", v)}
                      onAltura={(v) => updateRoom(room.id, "windowHeight", v)}
                    />
                    <span className="ml-auto text-gray-500">
                      vãos: <strong className="text-gray-700">{vaos > 0 ? vaos.toFixed(2) : "0"} m²</strong>
                    </span>
                  </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() => addRoom()}
                className="text-sm text-amber-700 hover:text-amber-800 flex items-center gap-1 font-medium"
              >
                <Plus className="w-4 h-4" />
                Adicionar cômodo
              </button>
              <div className="text-right">
                <p className="text-xs text-gray-500">Área total construída</p>
                <p className="text-xl font-bold text-amber-700">{totalArea().toFixed(2)} m²</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : `Próxima etapa — ${project.type === "REFORMA" ? "Diagnóstico" : "Estrutura"}`}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const mini =
  "rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-brand-500";

function VaoInput({
  rotulo, qtd, largura, altura, onQtd, onLargura, onAltura,
}: {
  rotulo: string; qtd: string; largura: string; altura: string;
  onQtd: (v: string) => void; onLargura: (v: string) => void; onAltura: (v: string) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-medium text-gray-700">{rotulo}</span>
      <input type="number" min="0" step="1" value={qtd} onChange={(e) => onQtd(e.target.value)}
        aria-label={`Quantidade de ${rotulo.toLowerCase()}`} className={`w-12 ${mini}`} />
      <span>de</span>
      <input type="number" min="0" step="any" value={largura} onChange={(e) => onLargura(e.target.value)}
        aria-label={`Largura das ${rotulo.toLowerCase()} (m)`} className={`w-14 ${mini}`} />
      <span>×</span>
      <input type="number" min="0" step="any" value={altura} onChange={(e) => onAltura(e.target.value)}
        aria-label={`Altura das ${rotulo.toLowerCase()} (m)`} className={`w-14 ${mini}`} />
      <span>m</span>
    </span>
  );
}
