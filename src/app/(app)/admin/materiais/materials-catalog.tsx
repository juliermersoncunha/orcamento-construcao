"use client";

import { useMemo, useState } from "react";
import { MaterialCategory } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download } from "lucide-react";
import { MaterialRow } from "./material-row";

type Material = {
  id: string;
  name: string;
  unit: string;
  category: MaterialCategory;
  currentPrice: number;
  priceDate: Date | string | null;
  active: boolean;
  quantity: number | null;
  brand: string | null;
  supplierId: string | null;
  supplier: { id: string; name: string } | null;
};

type Supplier = { id: string; name: string };

type Props = {
  materialsByCategory: [MaterialCategory, Material[]][];
  categoryLabels: Record<MaterialCategory, string>;
  suppliers: Supplier[];
};

function formatDateBR(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

export function MaterialsCatalog({ materialsByCategory, categoryLabels, suppliers }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [supplierPick, setSupplierPick] = useState("");

  const total = useMemo(
    () => materialsByCategory.reduce((s, [, list]) => s + list.length, 0),
    [materialsByCategory]
  );

  // Quantos materiais cada fornecedor atende — mostrado no seletor para não
  // escolher às cegas um fornecedor sem itens.
  const countBySupplier = useMemo(() => {
    const acc = new Map<string, number>();
    for (const [, list] of materialsByCategory) {
      for (const m of list) {
        if (m.supplierId) acc.set(m.supplierId, (acc.get(m.supplierId) ?? 0) + 1);
      }
    }
    return acc;
  }, [materialsByCategory]);

  // Auto seleção: marca todos os materiais do fornecedor escolhido, somando à
  // seleção atual (não limpa o que já estava marcado).
  function selectBySupplier(supplierId: string) {
    setSupplierPick(supplierId);
    if (!supplierId) return;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const [, list] of materialsByCategory) {
        for (const m of list) if (m.supplierId === supplierId) next.add(m.id);
      }
      return next;
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCategory(items: Material[], allSelected: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const it of items) {
        if (allSelected) next.delete(it.id);
        else next.add(it.id);
      }
      return next;
    });
  }

  function toggleAll(allSelected: boolean) {
    if (allSelected) {
      setSelected(new Set());
    } else {
      const next = new Set<string>();
      for (const [, list] of materialsByCategory) for (const m of list) next.add(m.id);
      setSelected(next);
    }
  }

  async function exportXlsx() {
    // Carregado sob demanda pra não pesar o bundle inicial.
    const XLSX = await import("xlsx");

    // Mantém a ordem por categoria + nome do que o usuário vê na tela.
    const rows: Record<string, string | number>[] = [];
    for (const [cat, list] of materialsByCategory) {
      for (const m of list) {
        if (!selected.has(m.id)) continue;
        rows.push({
          Categoria: categoryLabels[cat],
          Material: m.name,
          Marca: m.brand ?? "",
          Fornecedor: m.supplier?.name ?? "",
          Unidade: m.unit,
          Quantidade: m.quantity ?? "",
          "Preço (R$)": m.currentPrice,
          "Data do preço": formatDateBR(m.priceDate),
          Status: m.active ? "Ativo" : "Inativo",
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        "Categoria", "Material", "Marca", "Fornecedor", "Unidade",
        "Quantidade", "Preço (R$)", "Data do preço", "Status",
      ],
    });
    // Larguras confortáveis por coluna.
    ws["!cols"] = [
      { wch: 26 }, // Categoria
      { wch: 48 }, // Material
      { wch: 18 }, // Marca
      { wch: 24 }, // Fornecedor
      { wch: 10 }, // Unidade
      { wch: 12 }, // Quantidade
      { wch: 12 }, // Preço
      { wch: 14 }, // Data
      { wch: 10 }, // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Materiais");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `materiais-selecionados-${stamp}.xlsx`);
  }

  const allSelected = selected.size > 0 && selected.size === total;
  const anySelected = selected.size > 0;

  return (
    <>
      {/* Barra fixa de seleção — some quando não há nada selecionado */}
      <div className="sticky top-0 z-10 -mx-8 px-8 py-3 bg-white/95 backdrop-blur border-b border-gray-200 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = anySelected && !allSelected; }}
              onChange={() => toggleAll(allSelected)}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            {anySelected
              ? `${selected.size} de ${total} selecionado${selected.size > 1 ? "s" : ""}`
              : `Selecionar todos os ${total}`}
          </label>
          {anySelected && (
            <button
              type="button"
              onClick={() => { setSelected(new Set()); setSupplierPick(""); }}
              className="text-xs text-gray-500 underline hover:text-gray-700"
            >
              Limpar seleção
            </button>
          )}

          {suppliers.length > 0 && (
            <select
              value={supplierPick}
              onChange={(e) => selectBySupplier(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Selecionar itens de um fornecedor"
            >
              <option value="">Selecionar por fornecedor…</option>
              {suppliers.map((s) => {
                const n = countBySupplier.get(s.id) ?? 0;
                return (
                  <option key={s.id} value={s.id} disabled={n === 0}>
                    {s.name} ({n})
                  </option>
                );
              })}
            </select>
          )}
        </div>
        <Button
          type="button"
          onClick={exportXlsx}
          disabled={!anySelected}
          className="flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exportar Excel</span>
          {anySelected && <span className="text-xs opacity-80">({selected.size})</span>}
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {materialsByCategory.map(([category, items]) => {
          const catSelected = items.every((m) => selected.has(m.id));
          const catAny = items.some((m) => selected.has(m.id));
          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={catSelected}
                      ref={(el) => { if (el) el.indeterminate = catAny && !catSelected; }}
                      onChange={() => toggleCategory(items, catSelected)}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      aria-label={`Selecionar todos de ${categoryLabels[category]}`}
                    />
                    <span>{categoryLabels[category]}</span>
                    <span className="text-xs font-normal text-gray-400">{items.length}</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-2 w-8"></th>
                        <th className="text-left font-medium text-gray-500 py-2">Material</th>
                        <th className="text-left font-medium text-gray-500 py-2 px-2">Marca</th>
                        <th className="text-left font-medium text-gray-500 py-2 px-2">Fornecedor</th>
                        <th className="text-center font-medium text-gray-500 py-2">Unidade</th>
                        <th className="text-center font-medium text-gray-500 py-2">Qtd</th>
                        <th className="text-right font-medium text-gray-500 py-2">Preço (R$)</th>
                        <th className="text-center font-medium text-gray-500 py-2">Data do preço</th>
                        <th className="text-center font-medium text-gray-500 py-2">Status</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((material) => (
                        <MaterialRow
                          key={material.id}
                          material={material}
                          suppliers={suppliers}
                          selected={selected.has(material.id)}
                          onToggleSelect={() => toggle(material.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
