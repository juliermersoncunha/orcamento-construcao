"use client";

import { useState, useTransition } from "react";
import { addIndirectCost, deleteIndirectCost } from "@/app/actions/indirectCosts";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type Cost = {
  id: string;
  label: string;
  category: string;
  value: number;
};

type Props = {
  projectId: string;
  costs: Cost[];
};

const CATEGORIES = [
  { value: "PROJETO", label: "Projeto (arquitetônico/estrutural)" },
  { value: "REGULARIZACAO", label: "Regularização de terreno" },
  { value: "AVERBACAO", label: "Averbação da construção" },
  { value: "ALVARA", label: "Alvará / licenças" },
  { value: "TOPOGRAFIA", label: "Topografia / sondagem" },
  { value: "OUTROS", label: "Outros" },
];

export function CustosForm({ projectId, costs }: Props) {
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("PROJETO");
  const [value, setValue] = useState("");

  const total = costs.reduce((sum, c) => sum + c.value, 0);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!label || !value) return;
    const fd = new FormData();
    fd.append("label", label);
    fd.append("category", category);
    fd.append("value", value);
    startTransition(async () => {
      await addIndirectCost(projectId, fd);
      setLabel("");
      setValue("");
    });
  }

  function handleDelete(id: string) {
    startTransition(() => deleteIndirectCost(projectId, id));
  }

  const byCategory = CATEGORIES.map((cat) => ({
    ...cat,
    items: costs.filter((c) => c.category === cat.value),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Existing costs */}
      {byCategory.length > 0 && (
        <div className="flex flex-col gap-4">
          {byCategory.map((cat) => (
            <div key={cat.value}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {cat.label}
              </p>
              {cat.items.map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-200 mb-1"
                >
                  <span className="text-sm text-gray-800 flex-1">{cost.label}</span>
                  <span className="text-sm font-medium text-gray-900 mr-4">
                    {formatCurrency(cost.value)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(cost.id)}
                    disabled={isPending}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ))}

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-700">Total custos indiretos</span>
            <span className="text-base font-bold text-amber-700">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      {costs.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Nenhum custo indireto cadastrado ainda.
        </p>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="border-t border-gray-200 pt-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Adicionar custo</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Projeto arquitetônico"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button type="submit" variant="outline" disabled={isPending || !label || !value}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>
      </form>
    </div>
  );
}
