"use client";

import { useState } from "react";
import { ClipboardList, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

export type MissingMaterial = {
  id: string;
  name: string;
  unit: string;
  currentPrice: number;
  category: string;
};

type Props = {
  materials: MissingMaterial[];
  categoryLabels: Record<string, string>;
};

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Checklist de revisão: o que está cadastrado e ativo mas não entrou neste
// orçamento. Não é erro — a maioria dos itens do catálogo não se aplica a um
// projeto específico. Serve para o usuário bater o olho e lembrar do que
// esqueceu de lançar, agora que tubos, cabos, madeiramento e esquadrias são
// informados manualmente.
export function MissingMaterialsPanel({ materials, categoryLabels }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const byCategory = new Map<string, MissingMaterial[]>();
  for (const m of materials) {
    const list = byCategory.get(m.category) ?? [];
    list.push(m);
    byCategory.set(m.category, list);
  }
  const groups = [...byCategory.entries()].sort((a, b) =>
    (categoryLabels[a[0]] ?? a[0]).localeCompare(categoryLabels[b[0]] ?? b[0], "pt-BR")
  );

  function toggle(cat: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  if (materials.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600" />
        <div>
          <p className="font-semibold text-sm text-green-800">
            Revisão do catálogo — nada de fora
          </p>
          <p className="text-xs mt-0.5 text-green-700">
            Todo material ativo do catálogo entrou neste orçamento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 shrink-0 text-gray-500" />
          <div>
            <p className="font-semibold text-sm text-gray-800">
              Revisão — cadastrado no catálogo, fora deste orçamento
            </p>
            <p className="text-xs mt-0.5 text-gray-600">
              {materials.length} item(ns) em {groups.length} categoria(s) · confira se
              esqueceu de lançar algo
            </p>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-200 bg-white">
          <p className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
            A maior parte do catálogo não se aplica a um projeto — isto não é lista de erros.
            Itens manuais (tubos, cabos, madeiramento, esquadrias) são os que costumam faltar.
          </p>
          <div className="p-3 flex flex-col gap-1.5">
            {groups.map(([cat, items]) => {
              const isOpen = expanded.has(cat);
              return (
                <div key={cat} className="rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggle(cat)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {categoryLabels[cat] ?? cat}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">{items.length}</span>
                      {isOpen
                        ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                      {items.map((m) => (
                        <div
                          key={m.id}
                          className="px-3 py-1.5 flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-gray-700">{m.name}</span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {m.unit} ·{" "}
                            {m.currentPrice > 0
                              ? brl(m.currentPrice)
                              : <span className="text-amber-600">sem preço</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
