"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ClipboardList, Pencil, Check, X } from "lucide-react";
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
  stageId: string | null;
  materialId: string;
  status: string;
  usedAt: string;
  automatico: boolean;
  corrigido: boolean;
};

export type QuadroLinha = {
  materialId: string; name: string; unit: string;
  estimado: number; comprado: number; consumido: number;
};

const inputClass =
  "rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

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
  projectId, materials, stages, locationSuggestions, usages, quadro,
}: {
  projectId: string;
  materials: UsageMaterial[];
  stages: UsageStage[];
  locationSuggestions: string[];
  usages: UsageRow[];
  quadro: QuadroLinha[];
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

  // Por padrão mostra só o que ainda tem saldo na obra: é dali que sai a baixa.
  const [soNaObra, setSoNaObra] = useState(true);

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

      {/* Quadro: estimado x comprado x consumido */}
      {quadro.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-sm font-semibold text-gray-700">Estoque da obra</p>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input type="checkbox" checked={soNaObra} onChange={(e) => setSoNaObra(e.target.checked)} />
                só o que está na obra
              </label>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Comprado vem das compras marcadas na Programação. Dê baixa no que foi usado — a etapa é
              opcional — e o consumo sai do que está na obra.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="text-left font-medium py-1">Material</th>
                    <th className="text-center font-medium py-1 w-12">Un</th>
                    <th className="text-right font-medium py-1 w-20">Estimado</th>
                    <th className="text-right font-medium py-1 w-20">Comprado</th>
                    <th className="text-right font-medium py-1 w-20">Consumido</th>
                    <th className="text-right font-medium py-1 w-20" title="Comprado menos consumido">Na obra</th>
                    <th className="text-right font-medium py-1 w-24" title="Consumido menos estimado">Desvio</th>
                    <th className="text-left font-medium py-1 pl-4">Dar baixa</th>
                  </tr>
                </thead>
                <tbody>
                  {quadro.filter((q) => !soNaObra || q.comprado - q.consumido > 0).map((q) => {
                    const naObra = q.comprado - q.consumido;
                    const desvio = q.consumido - q.estimado;
                    const pct = q.estimado > 0 ? (desvio / q.estimado) * 100 : null;
                    return (
                      <tr key={q.materialId} className="border-b border-gray-100">
                        <td className="py-1.5 text-gray-800">{q.name}</td>
                        <td className="py-1.5 text-center text-gray-500">{q.unit}</td>
                        <td className="py-1.5 text-right text-gray-600">{fmt(q.estimado)}</td>
                        <td className="py-1.5 text-right text-gray-600">{fmt(q.comprado)}</td>
                        <td className="py-1.5 text-right font-medium text-gray-900">{fmt(q.consumido)}</td>
                        <td className={`py-1.5 text-right ${naObra < 0 ? "text-red-600" : "text-gray-600"}`}
                            title={naObra < 0 ? "Consumiu mais do que foi marcado como comprado" : undefined}>
                          {fmt(naObra)}
                        </td>
                        <td className={`py-1.5 text-right ${
                          q.consumido === 0 ? "text-gray-300" : desvio > 0 ? "text-red-600" : desvio < 0 ? "text-green-700" : "text-gray-600"
                        }`}>
                          {q.consumido === 0
                            ? "—"
                            : `${desvio > 0 ? "+" : ""}${fmt(desvio)}${pct !== null ? ` (${desvio > 0 ? "+" : ""}${Math.round(pct)}%)` : ""}`}
                        </td>
                        <td className="py-1 pl-4">
                          <Baixa
                            linha={q}
                            naObra={naObra}
                            stages={stages}
                            isPending={isPending}
                            onBaixar={(quantidade, stageId) => {
                              const etapa = stages.find((s) => s.id === stageId);
                              run(() => addMaterialUsage(projectId, {
                                materialId: q.materialId,
                                quantity: quantidade,
                                stageId: stageId || null,
                                location: etapa?.name ?? null,
                                usedAt: hoje(),
                              }));
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                    <th className="text-left font-medium py-1">Situação</th>
                    <th className="text-left font-medium py-1">Onde foi utilizado</th>
                    <th className="text-left font-medium py-1">Etapa</th>
                    <th className="w-14" />
                  </tr>
                </thead>
                <tbody>
                  {usages.map((u) => (
                    <LinhaLancamento
                      key={u.id}
                      u={u}
                      materials={materials}
                      stages={stages}
                      isPending={isPending}
                      run={run}
                    />
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

// Baixa direta a partir do estoque: quantidade usada e, se quiser, a etapa.
// Passar do que está na obra é permitido — pode ser material que não foi
// marcado como comprado —, mas a tela avisa antes.
function Baixa({
  linha, naObra, stages, isPending, onBaixar,
}: {
  linha: QuadroLinha;
  naObra: number;
  stages: UsageStage[];
  isPending: boolean;
  onBaixar: (quantidade: number, stageId: string) => void;
}) {
  const [qtd, setQtd] = useState("");
  const [stageId, setStageId] = useState("");
  const n = Number(qtd.replace(",", "."));
  const valido = qtd.trim() !== "" && Number.isFinite(n) && n > 0;
  const passa = valido && n > naObra;

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={qtd}
        onChange={(e) => setQtd(e.target.value)}
        inputMode="decimal"
        placeholder="qtd"
        aria-label={`Quantidade usada de ${linha.name}`}
        className={`w-16 rounded border px-1.5 py-0.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
          passa ? "border-amber-400 bg-amber-50" : "border-gray-300"
        }`}
        title={passa ? `Mais do que está na obra (${fmt(naObra)} ${linha.unit})` : undefined}
      />
      <select
        value={stageId}
        onChange={(e) => setStageId(e.target.value)}
        aria-label="Etapa (opcional)"
        className="max-w-[9rem] rounded border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-600"
      >
        <option value="">etapa (opcional)</option>
        {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button
        type="button"
        disabled={!valido || isPending}
        onClick={() => {
          if (passa && !confirm(`Dar baixa de ${fmt(n)} ${linha.unit}? Na obra constam ${fmt(naObra)}.`)) return;
          onBaixar(n, stageId);
          setQtd("");
          setStageId("");
        }}
        className="rounded bg-brand-600 px-2 py-0.5 text-xs font-medium text-white disabled:opacity-40"
      >
        Baixar
      </button>
    </div>
  );
}

// Um lançamento: só leitura, com o lápis para editar tudo de uma vez — data,
// material, quantidade, situação, onde e etapa. Editar campo a campo no blur,
// como era, salvava sem querer quem só passava o mouse/teclado pela linha.
function LinhaLancamento({
  u, materials, stages, isPending, run,
}: {
  u: UsageRow;
  materials: UsageMaterial[];
  stages: UsageStage[];
  isPending: boolean;
  run: (fn: () => Promise<{ error?: string } | void>) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [data, setData] = useState(u.usedAt);
  const [materialId, setMaterialId] = useState(u.materialId);
  const [qtd, setQtd] = useState(String(u.quantity));
  const [status, setStatus] = useState(u.status);
  const [onde, setOnde] = useState(u.location ?? "");
  const [stageId, setStageId] = useState(u.stageId ?? "");

  function abrir() {
    setData(u.usedAt); setMaterialId(u.materialId); setQtd(String(u.quantity));
    setStatus(u.status); setOnde(u.location ?? ""); setStageId(u.stageId ?? "");
    setEditando(true);
  }

  const noEstoque = u.status === "ESTOQUE";
  const campo = "rounded border border-gray-300 px-1.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  if (!editando) {
    return (
      <tr className={`border-b border-gray-100 ${noEstoque ? "text-gray-400" : ""}`}>
        <td className="py-1.5">{dataBR(u.usedAt)}</td>
        <td className={`py-1.5 ${noEstoque ? "line-through" : "text-gray-800"}`}>{u.materialName}</td>
        <td className="py-1.5 text-center">{fmt(u.quantity)}</td>
        <td className="py-1.5 text-center text-gray-500">{u.unit}</td>
        <td className="py-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${noEstoque ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>
            {noEstoque ? "voltou ao estoque" : "consumido"}
          </span>
        </td>
        <td className="py-1.5">{u.location ?? <span className="text-gray-300">—</span>}</td>
        <td className="py-1.5 text-xs text-gray-500">{u.stageName ?? <span className="text-gray-300">—</span>}</td>
        <td className="py-1.5 text-right whitespace-nowrap">
          <button type="button" aria-label="Editar lançamento" onClick={abrir} className="mr-2 text-gray-400 hover:text-brand-600">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Excluir lançamento"
            disabled={isPending}
            onClick={() => { if (confirm(`Excluir o lançamento de ${fmt(u.quantity)} ${u.unit} de ${u.materialName}?`)) run(() => deleteMaterialUsage(u.id)); }}
            className="text-gray-300 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
    );
  }

  const n = Number(qtd.replace(",", "."));
  const valido = Number.isFinite(n) && n > 0 && !!materialId;

  return (
    <tr className="border-b border-brand-200 bg-brand-50/40">
      <td className="py-1.5 pr-1"><input type="date" value={data} onChange={(e) => setData(e.target.value)} className={`w-32 ${campo}`} /></td>
      <td className="py-1.5 pr-1">
        <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={`w-full max-w-[16rem] bg-white ${campo}`}>
          {materials.some((m) => m.id === materialId) ? null : <option value={materialId}>{u.materialName}</option>}
          {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </td>
      <td className="py-1.5 pr-1 text-center">
        <input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="decimal" className={`w-20 text-center ${campo}`} />
      </td>
      <td className="py-1.5 text-center text-gray-500">{materials.find((m) => m.id === materialId)?.unit ?? u.unit}</td>
      <td className="py-1.5 pr-1">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`bg-white ${campo}`}>
          <option value="CONSUMIDO">consumido</option>
          <option value="ESTOQUE">voltou ao estoque</option>
        </select>
      </td>
      <td className="py-1.5 pr-1">
        <input value={onde} onChange={(e) => setOnde(e.target.value)} list="sugestoes-local" placeholder="—" className={`w-full ${campo}`} />
      </td>
      <td className="py-1.5 pr-1">
        <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={`w-full max-w-[11rem] bg-white text-xs ${campo}`}>
          <option value="">— sem etapa —</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </td>
      <td className="py-1.5 text-right whitespace-nowrap">
        <button
          type="button"
          aria-label="Salvar"
          disabled={!valido || isPending}
          onClick={() => {
            run(async () => {
              const r = await updateMaterialUsage(u.id, {
                usedAt: data, materialId, quantity: n, status,
                location: onde, stageId: stageId || null,
              });
              if (!r?.error) setEditando(false);
              return r;
            });
          }}
          className="mr-2 text-green-600 hover:text-green-800 disabled:opacity-40"
        >
          <Check className="w-4 h-4" />
        </button>
        <button type="button" aria-label="Cancelar" onClick={() => setEditando(false)} className="text-gray-400 hover:text-gray-700">
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
