"use client";

import { useState } from "react";
import { saveStep2Rooms } from "@/app/actions/wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutGrid, Plus, Trash2, ChevronRight } from "lucide-react";

type Room = { id: string; name: string; width: string; length: string; height: string };

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
      formData.append("roomName", r.name);
      formData.append("roomWidth", r.width);
      formData.append("roomLength", r.length);
      formData.append("roomHeight", r.height);
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
            Informe os cômodos e suas dimensões. A área é calculada automaticamente.
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
            <div className="grid grid-cols-[1fr_80px_80px_80px_40px] gap-2 mb-2 px-1">
              <p className="text-xs font-medium text-gray-500">Cômodo</p>
              <p className="text-xs font-medium text-gray-500 text-center">Larg. (m)</p>
              <p className="text-xs font-medium text-gray-500 text-center">Comp. (m)</p>
              <p className="text-xs font-medium text-gray-500 text-center">Área (m²)</p>
              <div />
            </div>

            <div className="flex flex-col gap-2 mb-4">
              {rooms.map((room) => {
                const area = (parseFloat(room.width) || 0) * (parseFloat(room.length) || 0);
                return (
                  <div
                    key={room.id}
                    className="grid grid-cols-[1fr_80px_80px_80px_40px] gap-2 items-center"
                  >
                    <input
                      value={room.name}
                      onChange={(e) => updateRoom(room.id, "name", e.target.value)}
                      placeholder="Nome do cômodo"
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="number"
                      value={room.width}
                      onChange={(e) => updateRoom(room.id, "width", e.target.value)}
                      placeholder="0,00"
                      step="0.01"
                      min="0"
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="number"
                      value={room.length}
                      onChange={(e) => updateRoom(room.id, "length", e.target.value)}
                      placeholder="0,00"
                      step="0.01"
                      min="0"
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                {isPending ? "Salvando..." : "Próxima etapa — Estrutura"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
