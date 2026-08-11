"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, Plus, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { addManualPhaseItem, removeManualPhaseItem } from "@/app/actions/manual-phase-items";

export type CatalogMaterial = {
  id: string;
  name: string;
  unit: string;
  currentPrice: number;
  category: string;
};

export type ManualPhaseRow = {
  materialId: string;
  name: string;
  unit: string;
  quantity: number;
  currentPrice: number;
  phase: string;
};

// Fases onde faz sentido lançar material avulso, na ordem da obra.
export const PHASE_OPTIONS: { value: string; label: string }[] = [
  { value: "TERRAPLENAGEM", label: "Terraplenagem" },
  { value: "FUNDACAO", label: "Fundação" },
  { value: "ESTRUTURA_ALVENARIA", label: "Estrutura e Alvenaria" },
  { value: "LAJE", label: "Laje" },
  { value: "COBERTURA", label: "Cobertura" },
  { value: "INSTALACOES_ELETRICAS", label: "Instalações Elétricas" },
  { value: "INSTALACOES_HIDROSSANITARIAS", label: "Instalações Hidrossanitárias" },
  { value: "ESCADA", label: "Escada" },
  { value: "REVESTIMENTOS", label: "Revestimentos" },
  { value: "PINTURA", label: "Pintura" },
  { value: "ACABAMENTO", label: "Acabamento" },
  { value: "OUTROS", label: "Outros" },
];

const PHASE_LABEL = Object.fromEntries(PHASE_OPTIONS.map((p) => [p.value, p.label]));

// Categorias do catálogo que costumam entrar em cada fase. Serve só para ordenar
// a lista: ao abrir o campo, o que pertence à fase escolhida aparece primeiro,
// mas nada fica escondido — digitar busca no catálogo inteiro.
const PHASE_CATEGORIES: Record<string, string[]> = {
  TERRAPLENAGEM: ["TERRAPLENAGEM"],
  FUNDACAO: ["FUNDACAO"],
  ESTRUTURA_ALVENARIA: ["ESTRUTURA", "ALVENARIA"],
  LAJE: ["LAJE"],
  COBERTURA: ["COBERTURA"],
  INSTALACOES_ELETRICAS: ["ELETRICA"],
  INSTALACOES_HIDROSSANITARIAS: [
    "HIDRAULICA", "LOUCAS_SANITARIAS", "METAIS_SANITARIOS", "ACESSORIOS_HIDRAULICOS",
  ],
  ESCADA: ["ESTRUTURA"],
  REVESTIMENTOS: ["REVESTIMENTO", "IMPERMEABILIZACAO"],
  PINTURA: ["PINTURA"],
  ACABAMENTO: ["ACABAMENTO", "ESQUADRIA", "VIDROS_BOX", "ACESSORIOS_BANHEIRO"],
  OUTROS: ["OUTROS"],
};

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  projectId: string;
  materials: CatalogMaterial[];
  rows: ManualPhaseRow[];
};

export function Step8MateriaisAvulsos({ projectId, materials, rows }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState("LAJE");
  const [search, setSearch] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);

  // Sem busca, a lista já vem preenchida com os materiais da fase escolhida —
  // não é preciso adivinhar o nome. Digitando, busca no catálogo inteiro.
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return materials.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 30);
    }
    const cats = PHASE_CATEGORIES[phase] ?? [];
    return materials
      .filter((m) => cats.includes(m.category))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .slice(0, 30);
  }, [search, materials, phase]);

  const chosen = materials.find((m) => m.id === materialId) ?? null;

  function add() {
    setError(null);
    const q = Number(quantity.replace(",", "."));
    if (!materialId) { setError("Escolha um material."); return; }
    if (!Number.isFinite(q) || q <= 0) { setError("Informe uma quantidade maior que zero."); return; }

    startTransition(async () => {
      const res = await addManualPhaseItem(projectId, { materialId, quantity: q, phase });
      if (res?.error) { setError(res.error); return; }
      setMaterialId("");
      setSearch("");
      setQuantity("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeManualPhaseItem(projectId, id);
      router.refresh();
    });
  }

  // Agrupa o que já foi lançado por fase, para o usuário conferir de relance.
  const byPhase = useMemo(() => {
    const acc = new Map<string, ManualPhaseRow[]>();
    for (const r of rows) {
      const list = acc.get(r.phase) ?? [];
      list.push(r);
      acc.set(r.phase, list);
    }
    return PHASE_OPTIONS
      .map((p) => [p.value, acc.get(p.value) ?? []] as const)
      .filter(([, list]) => list.length > 0);
  }, [rows]);

  const grandTotal = rows.reduce((s, r) => s + r.quantity * r.currentPrice, 0);

  const inputClass =
    "rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <PackagePlus className="w-4 h-4 text-amber-700" />
          </div>
          <CardTitle>Etapa 8 — Materiais avulsos</CardTitle>
        </div>
        <CardDescription>
          Lance materiais que o cálculo não gera, escolhendo em qual fase da obra eles entram.
          Serve para complementos de laje, cobertura, ou qualquer item específico do seu projeto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* ── Formulário de inclusão ── */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="phase" className="text-sm font-medium text-gray-700">Fase</label>
              <select
                id="phase"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className={`bg-white ${inputClass}`}
              >
                {PHASE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="search" className="text-sm font-medium text-gray-700">Material</label>
              <input
                id="search"
                value={chosen ? chosen.name : search}
                onChange={(e) => { setSearch(e.target.value); setMaterialId(""); setOpen(true); }}
                onFocus={() => { setOpen(true); if (chosen) setMaterialId(""); }}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Clique para ver os materiais da fase, ou digite para buscar…"
                className={`bg-white ${inputClass}`}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Resultados da busca */}
          {open && !chosen && matches.length > 0 && (
            <div className="mb-3 rounded-md border border-gray-200 bg-white divide-y divide-gray-100 max-h-56 overflow-y-auto">
              {search.trim() === "" && (
                <p className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 sticky top-0">
                  Materiais de {PHASE_LABEL[phase]} — digite para buscar em todo o catálogo
                </p>
              )}
              {matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setMaterialId(m.id); setSearch(""); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex items-center justify-between gap-3"
                >
                  <span className="text-gray-800">{m.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {m.unit} ·{" "}
                    {m.currentPrice > 0
                      ? brl(m.currentPrice)
                      : <span className="text-amber-600">sem preço</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
          {open && !chosen && search.trim() !== "" && matches.length === 0 && (
            <p className="mb-3 text-sm text-gray-500">
              Nenhum material encontrado. Cadastre-o em Admin › Materiais e Preços.
            </p>
          )}

          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                Quantidade {chosen && <span className="text-gray-400">({chosen.unit})</span>}
              </label>
              <input
                id="quantity"
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className={`w-32 bg-white ${inputClass}`}
              />
            </div>
            <Button type="button" onClick={add} disabled={isPending || !chosen}>
              <Plus className="w-4 h-4 mr-1" />
              {isPending ? "Salvando…" : "Adicionar"}
            </Button>
            {chosen && chosen.currentPrice === 0 && (
              <p className="text-xs text-amber-700 pb-2">
                Este material está sem preço — entra no orçamento com custo R$ 0.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        {/* ── Itens já lançados ── */}
        <div className="mt-6">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              Nenhum material avulso lançado. Esta etapa é opcional.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {byPhase.map(([ph, list]) => {
                const subtotal = list.reduce((s, r) => s + r.quantity * r.currentPrice, 0);
                return (
                  <section key={ph}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-800">{PHASE_LABEL[ph] ?? ph}</h3>
                      <span className="text-sm font-medium text-gray-700">{brl(subtotal)}</span>
                    </div>
                    <div className="rounded-lg border border-gray-200 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="text-left py-2 px-3 font-medium">Material</th>
                            <th className="text-center py-2 px-3 font-medium w-20">Unid.</th>
                            <th className="text-right py-2 px-3 font-medium w-24">Qtd</th>
                            <th className="text-right py-2 px-3 font-medium w-28">Preço</th>
                            <th className="text-right py-2 px-3 font-medium w-28">Total</th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((r) => (
                            <tr key={r.materialId} className="border-t border-gray-200">
                              <td className="py-2 px-3 text-gray-800">{r.name}</td>
                              <td className="py-2 px-3 text-center text-gray-600">{r.unit}</td>
                              <td className="py-2 px-3 text-right text-gray-700">
                                {r.quantity.toLocaleString("pt-BR")}
                              </td>
                              <td className="py-2 px-3 text-right text-gray-600">
                                {r.currentPrice > 0
                                  ? brl(r.currentPrice)
                                  : <span className="text-amber-600">R$ 0</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-gray-800">
                                {brl(r.quantity * r.currentPrice)}
                              </td>
                              <td className="py-2 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => remove(r.materialId)}
                                  disabled={isPending}
                                  title="Remover"
                                  className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}

              <div className="flex justify-end pt-1 border-t border-gray-200">
                <p className="text-sm text-gray-700">
                  Total de materiais avulsos:{" "}
                  <span className="font-semibold text-gray-900">{brl(grandTotal)}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button
            type="button"
            onClick={() => router.push(`/projetos/${projectId}/wizard?etapa=9`)}
          >
            Próxima etapa — Revisão
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
