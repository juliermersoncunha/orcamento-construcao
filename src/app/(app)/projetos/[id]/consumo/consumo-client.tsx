"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addMaterialUsage, updateMaterialUsage, deleteMaterialUsage } from "@/app/actions/material-usage";

export type UsageMaterial = { id: string; name: string; unit: string };
export type UsageStage = { id: string; name: string };

export type UsageRow = {
  id: string;
  materialName: string;
  unit: string;
  quantity: number;
  location: string | null;
  stageName: string | null;
  usedAt: string;
};

const inputClass =
  "rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

function hoje() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function ConsumoClient({
  projectId, materials, stages, locationSuggestions, usages,
}: {
  projectId: string;
  materials: UsageMaterial[];
  stages: UsageStage[];
  locationSuggestions: string[];
  usages: UsageRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [stageId, setStageId] = useState("");
  const [usedAt, setUsedAt] = useState(hoje());

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) { setError(res.error); return; }
      router.refresh();
    });
  }

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? materials.filter((m) => m.name.toLowerCase().includes(q)) : materials;
    return list.slice(0, 30);
  }, [search, materials]);

  const chosen = materials.find((m) => m.id === materialId) ?? null;

  // Totais por material: é a leitura que interessa depois — quanto de cada
  // coisa já saiu, somando todos os lançamentos.
  const porMaterial = useMemo(() => {
    const acc = new Map<string, { nome: string; unit: string; total: number; lancamentos: number }>();
    for (const u of usages) {
      const k = `${u.materialName}|${u.unit}`;
      const a = acc.get(k) ?? { nome: u.materialName, unit: u.unit, total: 0, lancamentos: 0 };
      a.total += u.quantity;
      a.lancamentos += 1;
      acc.set(k, a);
    }
    return [...acc.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [usages]);

  function lancar() {
    if (!materialId) { setError("Escolha um material."); return; }
    run(async () => {
      const r = await addMaterialUsage(projectId, {
        materialId,
        quantity: Number(quantity.replace(",", ".")),
        location,
        stageId: stageId || null,
        usedAt,
      });
      if (!r?.error) {
        setMaterialId(""); setSearch(""); setQuantity(""); setLocation("");
      }
      return r;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Lançamento */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Lançar material utilizado</p>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5 flex flex-col gap-1 relative">
              <label htmlFor="material" className="text-xs font-medium text-gray-600">Material</label>
              <input
                id="material"
                value={chosen ? chosen.name : search}
                onChange={(e) => { setSearch(e.target.value); setMaterialId(""); setOpen(true); }}
                onFocus={() => { setOpen(true); if (chosen) setMaterialId(""); }}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Clique para ver os materiais cadastrados…"
                className={`bg-white ${inputClass}`}
                autoComplete="off"
              />
              {open && !chosen && matches.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border border-gray-200 bg-white divide-y divide-gray-100 max-h-56 overflow-y-auto shadow-lg">
                  {matches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setMaterialId(m.id); setSearch(""); setOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 flex items-center justify-between gap-3"
                    >
                      <span className="text-gray-800">{m.name}</span>
                      <span className="text-xs text-gray-500 shrink-0">{m.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1">
              <label htmlFor="qtd" className="text-xs font-medium text-gray-600">
                Quantidade {chosen && <span className="text-gray-400">({chosen.unit})</span>}
              </label>
              <input
                id="qtd"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className={`bg-white ${inputClass}`}
              />
            </div>

            <div className="sm:col-span-3 flex flex-col gap-1">
              <label htmlFor="onde" className="text-xs font-medium text-gray-600">Onde foi utilizado</label>
              <input
                id="onde"
                list="sugestoes-local"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex.: muro frontal"
                className={`bg-white ${inputClass}`}
              />
              <datalist id="sugestoes-local">
                {locationSuggestions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1">
              <label htmlFor="data" className="text-xs font-medium text-gray-600">Data</label>
              <input
                id="data"
                type="date"
                value={usedAt}
                onChange={(e) => setUsedAt(e.target.value)}
                className={`bg-white ${inputClass}`}
              />
            </div>
          </div>

          <div className="flex items-end gap-3 mt-3">
            {stages.length > 0 && (
              <div className="flex flex-col gap-1 flex-1">
                <label htmlFor="etapa" className="text-xs font-medium text-gray-600">
                  Etapa do cronograma <span className="text-gray-400">(opcional)</span>
                </label>
                <select
                  id="etapa"
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className={`bg-white ${inputClass}`}
                >
                  <option value="">— sem etapa —</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Button onClick={lancar} disabled={isPending || !materialId || !quantity}>
              <Plus className="w-4 h-4" />
              Lançar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Totais por material */}
      {porMaterial.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Total consumido por material</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="text-left font-medium py-1">Material</th>
                  <th className="text-center font-medium py-1 w-24">Total</th>
                  <th className="text-center font-medium py-1 w-20">Un</th>
                  <th className="text-center font-medium py-1 w-28">Lançamentos</th>
                </tr>
              </thead>
              <tbody>
                {porMaterial.map((m) => (
                  <tr key={m.nome + m.unit} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-800">{m.nome}</td>
                    <td className="py-1.5 text-center font-medium text-gray-900">
                      {m.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-1.5 text-center text-gray-500">{m.unit}</td>
                    <td className="py-1.5 text-center text-gray-500">{m.lancamentos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Lançamentos */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Lançamentos {usages.length > 0 && <span className="text-gray-400 font-normal">· {usages.length}</span>}
          </p>

          {usages.length === 0 ? (
            <div className="py-8 flex flex-col items-center text-center gap-2">
              <ClipboardList className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                Nenhum material lançado ainda. Registre acima o que foi usado na obra.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="text-left font-medium py-1 w-28">Data</th>
                    <th className="text-left font-medium py-1">Material</th>
                    <th className="text-center font-medium py-1 w-24">Qtd</th>
                    <th className="text-center font-medium py-1 w-16">Un</th>
                    <th className="text-left font-medium py-1">Onde foi utilizado</th>
                    <th className="text-left font-medium py-1">Etapa</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {usages.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100">
                      <td className="py-1.5">
                        <input
                          type="date"
                          defaultValue={u.usedAt}
                          onBlur={(e) => {
                            if (e.target.value && e.target.value !== u.usedAt) {
                              run(() => updateMaterialUsage(u.id, { usedAt: e.target.value }));
                            }
                          }}
                          className="w-full rounded border border-transparent hover:border-gray-300 px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          title={dataBR(u.usedAt)}
                        />
                      </td>
                      <td className="py-1.5 text-gray-800">{u.materialName}</td>
                      <td className="py-1.5 text-center">
                        <input
                          type="number" min="0" step="any"
                          defaultValue={u.quantity}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v > 0 && v !== u.quantity) {
                              run(() => updateMaterialUsage(u.id, { quantity: v }));
                            }
                          }}
                          className="w-20 text-center rounded border border-gray-300 px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </td>
                      <td className="py-1.5 text-center text-gray-500">{u.unit}</td>
                      <td className="py-1.5">
                        <input
                          defaultValue={u.location ?? ""}
                          onBlur={(e) => {
                            if (e.target.value !== (u.location ?? "")) {
                              run(() => updateMaterialUsage(u.id, { location: e.target.value }));
                            }
                          }}
                          placeholder="—"
                          className="w-full rounded border border-transparent hover:border-gray-300 px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </td>
                      <td className="py-1.5 text-gray-500 text-xs">
                        {u.stageName ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-1.5 text-right">
                        <button
                          type="button"
                          aria-label="Excluir lançamento"
                          disabled={isPending}
                          onClick={() => run(() => deleteMaterialUsage(u.id))}
                          className="text-gray-300 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
