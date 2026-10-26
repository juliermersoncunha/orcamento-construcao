"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RENOVATION_SERVICES, SERVICE_BY_KEY, SERVICE_GROUPS, medidaSugerida } from "@/lib/renovation-services";
import { addRenovationServiceBatch } from "@/app/actions/renovation";

type Room = {
  id: string; name: string; width: number; length: number; height: number;
  doors?: number; doorWidth?: number; doorHeight?: number;
  windows?: number; windowWidth?: number; windowHeight?: number;
};
type Service = { roomId: string | null; serviceKey: string; label: string | null };

const campo =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

// Lança o mesmo serviço em vários ambientes de uma vez — piso na casa toda,
// pintura em todos os quartos. Cada ambiente recebe a própria medida.
export function LancarEmVarios({ projectId, rooms, services }: { projectId: string; rooms: Room[]; services: Service[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [qtd, setQtd] = useState("1");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const def = SERVICE_BY_KEY.get(key);
  const jaTem = (roomId: string) =>
    services.some((s) => s.roomId === roomId && s.serviceKey === key && (key !== "outro" || (s.label ?? "") === label.trim()));
  const disponiveis = rooms.filter((r) => !jaTem(r.id));
  const todos = disponiveis.length > 0 && disponiveis.every((r) => marcados.has(r.id));
  const selecionados = disponiveis.filter((r) => marcados.has(r.id));

  function alternar(id: string) {
    setMarcados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function lancar() {
    setAviso(null);
    startTransition(async () => {
      const r = await addRenovationServiceBatch(projectId, {
        serviceKey: key,
        roomIds: selecionados.map((x) => x.id),
        quantity: Number(qtd.replace(",", ".")),
        label,
      });
      if (r.error) { setAviso({ tipo: "erro", texto: r.error }); return; }
      const partes = [`${def?.label} lançado em ${r.criados} ambiente(s).`];
      if (r.pulados?.length) partes.push(`Já tinham: ${r.pulados.join(", ")}.`);
      if (r.semMedida?.length) partes.push(`Sem medida (confira as dimensões): ${r.semMedida.join(", ")}.`);
      setAviso({ tipo: "ok", texto: partes.join(" ") });
      setMarcados(new Set());
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="py-3">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="flex w-full items-center gap-2 text-left"
        >
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${aberto ? "" : "-rotate-90"}`} />
          <Layers className="w-4 h-4 text-brand-700" />
          <span className="text-sm font-semibold text-gray-900">Lançar um serviço em vários ambientes</span>
          <span className="text-xs text-gray-500">— ex.: piso ou pintura na casa toda</span>
        </button>

        {aberto && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={key}
                onChange={(e) => { setKey(e.target.value); setMarcados(new Set()); setAviso(null); }}
                className={campo}
              >
                <option value="" disabled>Escolha o serviço…</option>
                {SERVICE_GROUPS.map((g) => (
                  <optgroup key={g} label={g}>
                    {RENOVATION_SERVICES.filter((s) => s.grupo === g).map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {key === "outro" && (
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="descreva o serviço" className={`flex-1 min-w-[12rem] ${campo}`} />
              )}
              {def && !def.medida && (
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  quantidade por ambiente
                  <input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="decimal" className={`w-20 text-right ${campo}`} />
                  <span className="text-xs text-gray-500">{def.unit}</span>
                </label>
              )}
            </div>

            {def && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {def.medida
                      ? "Cada ambiente recebe a própria medida (com desconto de portas e janelas). Ajuste depois no ambiente, se for parcial."
                      : "Todos recebem a mesma quantidade."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMarcados(todos ? new Set() : new Set(disponiveis.map((r) => r.id)))}
                    className="shrink-0 text-xs font-medium text-brand-700 hover:underline"
                  >
                    {todos ? "Limpar seleção" : "Selecionar todos"}
                  </button>
                </div>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {rooms.map((r) => {
                    const tem = jaTem(r.id);
                    const medida = def.medida ? medidaSugerida(def, r) : null;
                    return (
                      <li key={r.id}>
                        <label className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${tem ? "border-gray-100 bg-gray-50 text-gray-400" : "border-gray-200 hover:bg-gray-50 cursor-pointer"}`}>
                          <input type="checkbox" disabled={tem} checked={!tem && marcados.has(r.id)} onChange={() => alternar(r.id)} />
                          <span className="flex-1">{r.name.trim()}</span>
                          <span className="text-xs text-gray-500">
                            {tem ? "já tem" : medida !== null ? `${fmt(medida)} ${def.unit}` : `${qtd || "—"} ${def.unit}`}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" disabled={isPending || selecionados.length === 0} onClick={lancar}>
                    {isPending ? "Lançando…" : `Lançar em ${selecionados.length} ambiente(s)`}
                  </Button>
                  {aviso && (
                    <span className={`text-xs ${aviso.tipo === "erro" ? "text-red-700" : "text-green-700"}`}>{aviso.texto}</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
