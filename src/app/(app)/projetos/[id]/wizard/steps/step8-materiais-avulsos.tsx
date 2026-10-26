"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, Plus, Trash2, ChevronRight, Wrench, AlertTriangle, Pencil, Check, X, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { addManualPhaseItem, removeManualPhaseItem, updateManualPhaseItem } from "@/app/actions/manual-phase-items";

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
  { value: "ESQUADRIAS", label: "Esquadrias" },
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
  ESQUADRIAS: ["ESQUADRIA"],
  ACABAMENTO: ["ACABAMENTO", "VIDROS_BOX", "ACESSORIOS_BANHEIRO"],
  OUTROS: ["OUTROS"],
};

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type ServicoPendente = {
  id: string; label: string; unit: string; quantity: number;
  ambiente: string; problema: string | null;
  descricao: string | null; faseSugerida: string;
};

type Props = {
  projectId: string;
  materials: CatalogMaterial[];
  rows: ManualPhaseRow[];
  servicosPendentes?: ServicoPendente[];
};

export function Step8MateriaisAvulsos({ projectId, materials, rows, servicosPendentes = [] }: Props) {
  const router = useRouter();
  // Em reforma, a fase inicial e a do primeiro servico pendente — leva o
  // usuario direto ao caso mais comum.
  const [phase, setPhase] = useState(servicosPendentes[0]?.faseSugerida ?? "LAJE");
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
    "rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

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
        {servicosPendentes.length > 0 && (
          <PainelServicosPendentes
            servicos={servicosPendentes}
            materiaisPorFase={new Map(rows.map((r) => [r.phase, (rows.filter((x) => x.phase === r.phase).length)]))}
            onEscolher={(fase) => { setPhase(fase); document.getElementById("search")?.focus(); }}
          />
        )}

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
                            <LinhaManual
                              key={r.materialId}
                              r={r}
                              projectId={projectId}
                              isPending={isPending}
                              onRemover={() => remove(r.materialId)}
                              onEditado={() => router.refresh()}
                              onErro={setError}
                            />
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

// Mostra os serviços da reforma que não geram material sozinhos. O usuário vê
// problema → ambiente → serviço, e um botão pré-seleciona a fase do formulário
// abaixo. O vínculo material ↔ serviço fica implícito pela fase, que é o que o
// banco já guarda; marcar explicitamente qual material resolve qual serviço
// seria outra entrega.
function PainelServicosPendentes({
  servicos, materiaisPorFase, onEscolher,
}: {
  servicos: ServicoPendente[];
  materiaisPorFase: Map<string, number>;
  onEscolher: (fase: string) => void;
}) {
  // Agrupa por ambiente, mantendo a ordem em que o usuário vistoriou.
  const porAmbiente = new Map<string, ServicoPendente[]>();
  for (const s of servicos) {
    const l = porAmbiente.get(s.ambiente) ?? [];
    l.push(s);
    porAmbiente.set(s.ambiente, l);
  }

  return (
    <div className="mb-5 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Wrench className="w-4 h-4 text-brand-700" />
        <h3 className="text-sm font-semibold text-gray-800">
          Serviços que precisam de material à mão
        </h3>
        <span className="text-xs text-gray-500">· {servicos.length}</span>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Estes serviços da reforma não têm material calculado. Clique em um para o formulário abaixo
        abrir já na fase certa, pronto para você escolher o produto no catálogo.
      </p>
      <div className="flex flex-col gap-3">
        {[...porAmbiente.entries()].map(([ambiente, lista]) => (
          <div key={ambiente} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
              <Home className="w-4 h-4 text-brand-700" />
              <h4 className="text-sm font-bold text-gray-900">{ambiente.trim()}</h4>
              <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800">
                {lista.length} {lista.length === 1 ? "serviço" : "serviços"}
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {lista.map((s) => {
                const nLanc = materiaisPorFase.get(s.faseSugerida) ?? 0;
                const fase = PHASE_LABEL[s.faseSugerida] ?? s.faseSugerida;
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    {s.problema ? (
                      <span className="text-gray-800">
                        <strong>{s.problema}</strong>
                        {s.descricao && <span className="text-gray-500"> — {s.descricao}</span>}
                        <span className="text-gray-500"> · {s.label}</span>
                      </span>
                    ) : (
                      <span className="text-gray-800 inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-gray-400" />
                        <span>{s.label}</span>
                        <span className="text-xs text-gray-500">(melhoria)</span>
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {s.quantity} {s.unit}
                    </span>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => onEscolher(s.faseSugerida)}
                      className="shrink-0 rounded-md border border-brand-300 bg-white px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                      title={`Pré-selecionar a fase "${fase}" no formulário abaixo`}
                    >
                      Lançar material em {fase}
                      {nLanc > 0 && <span className="ml-1 text-gray-500">({nLanc})</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// Linha de material avulso: só leitura por padrão. O lápis abre a edição de
// quantidade e fase na própria linha. Trocar a fase move a linha para a seção
// correta ao salvar.
function LinhaManual({
  r, projectId, isPending, onRemover, onEditado, onErro,
}: {
  r: ManualPhaseRow;
  projectId: string;
  isPending: boolean;
  onRemover: () => void;
  onEditado: () => void;
  onErro: (msg: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [qtd, setQtd] = useState(String(r.quantity).replace(".", ","));
  const [fase, setFase] = useState(r.phase);
  const [salvando, iniciar] = useTransition();
  const campo = "rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  function salvar() {
    const q = Number(qtd.replace(/\./g, "").replace(",", "."));
    if (!(q > 0)) { onErro("Quantidade inválida."); return; }
    iniciar(async () => {
      const resp = await updateManualPhaseItem(projectId, r.materialId, { quantity: q, phase: fase });
      if (resp?.error) { onErro(resp.error); return; }
      setEditando(false);
      onEditado();
    });
  }

  if (!editando) {
    return (
      <tr className="border-t border-gray-200">
        <td className="py-2 px-3 text-gray-800">{r.name}</td>
        <td className="py-2 px-3 text-center text-gray-600">{r.unit}</td>
        <td className="py-2 px-3 text-right text-gray-700">{r.quantity.toLocaleString("pt-BR")}</td>
        <td className="py-2 px-3 text-right text-gray-600">
          {r.currentPrice > 0 ? brl(r.currentPrice) : <span className="text-amber-600">R$ 0</span>}
        </td>
        <td className="py-2 px-3 text-right font-medium text-gray-800">{brl(r.quantity * r.currentPrice)}</td>
        <td className="py-2 px-2 text-right whitespace-nowrap">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="mr-1 p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { if (confirm(`Remover "${r.name}"?`)) onRemover(); }}
            disabled={isPending}
            title="Remover"
            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-brand-200 bg-brand-50/40">
      <td className="py-2 px-3 text-gray-800">
        {r.name}
        <select
          value={fase}
          onChange={(e) => setFase(e.target.value)}
          className={`block mt-1 text-xs ${campo}`}
          title="Fase da obra"
        >
          {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </td>
      <td className="py-2 px-3 text-center text-gray-600">{r.unit}</td>
      <td className="py-2 px-3 text-right">
        <input
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
          inputMode="decimal"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") setEditando(false); }}
          className={`w-20 text-right ${campo}`}
        />
      </td>
      <td className="py-2 px-3 text-right text-gray-400">—</td>
      <td className="py-2 px-3 text-right text-gray-400">—</td>
      <td className="py-2 px-2 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="mr-1 p-1.5 rounded text-green-600 hover:bg-green-50"
          title="Salvar"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { setQtd(String(r.quantity).replace(".", ",")); setFase(r.phase); setEditando(false); }}
          className="p-1.5 rounded text-gray-400 hover:text-gray-700"
          title="Cancelar"
        >
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
