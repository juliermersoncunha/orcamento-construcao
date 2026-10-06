"use client";

import { useMemo, useState } from "react";
import { MaterialCategory } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, Search, X } from "lucide-react";
import { MaterialRow } from "./material-row";
import { MATERIAL_CATEGORIES } from "@/lib/material-categories";

type Material = {
  id: string;
  name: string;
  calcName: string | null;
  usos: string[];
  noCalculo: boolean;
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
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [supplierPick, setSupplierPick] = useState("");

  // Lista unica: separar por categoria obrigava o material a ter uma so, e
  // cimento serve a varias fases. O lugar dessa informacao agora e o campo de
  // usos, que aceita mais de um valor.
  const todos = useMemo(
    () => materialsByCategory.flatMap(([, list]) => list)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [materialsByCategory]
  );

  // Opcoes de uso: as areas que o sistema ja conhece, mais qualquer uso ja
  // gravado — assim a lista cresce com o catalogo sem precisar de cadastro.
  const usoOptions = useMemo(() => {
    const base = MATERIAL_CATEGORIES.map((c) => c.label);
    const salvos = todos.flatMap((m) => m.usos ?? []);
    return [...new Set([...base, ...salvos])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [todos]);

  const norm = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // Busca por nome, usos, marca e fornecedor — com 185 itens numa lista so,
  // procurar pelo nome exato nem sempre e o caminho mais curto.
  const visiveis = useMemo(() => {
    const q = norm(busca.trim());
    if (!q) return todos;
    // "calculo" como termo de busca filtra os que entram no cálculo automático.
    if (q === "calculo") return todos.filter((m) => m.noCalculo);
    return todos.filter((m) =>
      norm(m.name).includes(q) ||
      (m.usos ?? []).some((u) => norm(u).includes(q)) ||
      norm(m.brand ?? "").includes(q) ||
      norm(m.supplier?.name ?? "").includes(q)
    );
  }, [todos, busca]);

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

  // Com busca ativa, marca so o que esta na tela: marcar os 185 quando o
  // usuario filtrou para 3 seria o oposto do que ele pediu.
  function toggleAll(todosMarcados: boolean) {
    if (todosMarcados) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visiveis.map((m) => m.id)));
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

  const allSelected =
    visiveis.length > 0 && visiveis.every((m) => selected.has(m.id));
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
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            {anySelected
              ? `${selected.size} de ${total} selecionado${selected.size > 1 ? "s" : ""}`
              : busca
              ? `Selecionar os ${visiveis.length} encontrados`
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

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar material, uso, marca… (ou “cálculo”)"
              className="w-72 rounded-md border border-gray-300 bg-white pl-8 pr-8 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Pesquisar material"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {suppliers.length > 0 && (
            <select
              value={supplierPick}
              onChange={(e) => selectBySupplier(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
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

      <Card>
        <CardContent className="pt-5">
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
                {visiveis.map((material) => (
                  <MaterialRow
                    key={material.id}
                    material={material}
                    suppliers={suppliers}
                    usoOptions={usoOptions}
                    selected={selected.has(material.id)}
                    onToggleSelect={() => toggle(material.id)}
                  />
                ))}
              </tbody>
            </table>
            {visiveis.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                Nenhum material encontrado para “{busca}”.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
