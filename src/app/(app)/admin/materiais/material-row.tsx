"use client";

import { useState, useTransition } from "react";
import { updateMaterial, toggleMaterialActive, deleteMaterial } from "@/app/actions/materials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil, Trash2 } from "lucide-react";
import { MATERIAL_CATEGORIES } from "@/lib/material-categories";

export type SupplierOption = { id: string; name: string };

// Date <-> yyyy-MM-dd for <input type="date">, read in local time so the day doesn't shift.
function toInputDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
}

// 18 → "18"; 1.5 → "1,5" (sem zeros à toa)
function formatQty(q: number | null | undefined) {
  if (q == null || !Number.isFinite(q)) return null;
  return String(q).replace(".", ",");
}

export function MaterialRow({
  material,
  suppliers = [],
  selected,
  onToggleSelect,
}: {
  material: any;
  suppliers?: SupplierOption[];
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(material.name);
  const [price, setPrice] = useState(String(material.currentPrice));
  const [priceDate, setPriceDate] = useState(toInputDate(material.priceDate));
  const [unit, setUnit] = useState(material.unit);
  const [category, setCategory] = useState(material.category);
  const [quantity, setQuantity] = useState(material.quantity == null ? "" : String(material.quantity));
  const [brand, setBrand] = useState(material.brand ?? "");
  const [supplierId, setSupplierId] = useState(material.supplierId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEditing() {
    setName(material.name);
    setPrice(String(material.currentPrice));
    setPriceDate(toInputDate(material.priceDate));
    setUnit(material.unit);
    setCategory(material.category);
    setQuantity(material.quantity == null ? "" : String(material.quantity));
    setBrand(material.brand ?? "");
    setSupplierId(material.supplierId ?? "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) {
      setError("Preço inválido.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Nome obrigatório.");
      return;
    }
    const q = quantity.trim() === "" ? null : Number(quantity.replace(",", "."));
    if (q !== null && (!Number.isFinite(q) || q <= 0)) {
      setError("Quantidade inválida.");
      return;
    }
    if (unit.trim() === "") {
      setError("Unidade obrigatória.");
      return;
    }
    startTransition(async () => {
      const result = await updateMaterial(material.id, {
        name,
        price: p,
        priceDate: priceDate || null,
        unit,
        category,
        quantity: q,
        brand,
        supplierId: supplierId || null,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setError(null);
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  }

  function toggleActive() {
    startTransition(() => toggleMaterialActive(material.id, !material.active));
  }

  function handleDelete() {
    if (!confirm(`Excluir "${material.name}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteMaterial(material.id);
      if (result?.error) setError(result.error);
    });
  }

  const inputClass =
    "rounded border border-amber-400 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

  if (editing) {
    return (
      <tr className="border-b border-gray-50 bg-amber-50/40">
        {onToggleSelect && <td className="py-2 w-8" />}
        <td className="py-2 pr-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            className={`w-full ${inputClass}`}
          />
          {/* Área (categoria) fica sob o nome: muda a seção onde o material
              aparece no catálogo, sem precisar de coluna própria na tabela. */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            title="Área do material"
            className={`mt-1 w-full bg-white text-xs ${inputClass}`}
          >
            {MATERIAL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </td>
        <td className="py-2 px-2">
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="marca"
            className={`w-28 ${inputClass}`}
          />
        </td>
        <td className="py-2 px-2">
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={`w-36 bg-white ${inputClass}`}
          >
            <option value="">— sem fornecedor —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </td>
        <td className="py-2 px-2 text-center">
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="un"
            className={`w-16 text-center ${inputClass}`}
          />
        </td>
        <td className="py-2 px-2 text-center">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={onKeyDown}
            step="0.01"
            min="0"
            placeholder="—"
            className={`w-20 text-center ${inputClass}`}
          />
        </td>
        <td className="py-2 px-2 text-right">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={onKeyDown}
            step="0.01"
            min="0"
            className={`w-24 text-right ${inputClass}`}
          />
        </td>
        <td className="py-2 px-2 text-center">
          <input
            type="date"
            value={priceDate}
            onChange={(e) => setPriceDate(e.target.value)}
            onKeyDown={onKeyDown}
            className={inputClass}
          />
        </td>
        <td className="py-2 px-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={save}
              disabled={isPending}
              title="Salvar"
              className="p-1 rounded text-green-600 hover:bg-green-50 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={cancel}
              title="Cancelar"
              className="p-1 rounded text-gray-400 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
        <td className="py-2 pl-2" />
      </tr>
    );
  }

  const shownDate = formatDate(material.priceDate);
  const shownQty = formatQty(material.quantity);

  return (
    <tr className={`border-b border-gray-50 ${!material.active ? "opacity-40" : ""} ${selected ? "bg-amber-50/60" : ""}`}>
      {onToggleSelect && (
        <td className="py-2 w-8">
          <input
            type="checkbox"
            checked={!!selected}
            onChange={onToggleSelect}
            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            aria-label={`Selecionar ${material.name}`}
          />
        </td>
      )}
      <td className="py-2 pr-4">
        <button
          onClick={startEditing}
          className="flex items-center gap-1.5 text-left text-gray-800 hover:text-amber-700 group"
        >
          <span>{material.name}</span>
          <Pencil className="w-3 h-3 text-gray-400 group-hover:text-amber-600 shrink-0" />
        </button>
      </td>
      <td className="py-2 px-2">
        <button onClick={startEditing} className="text-gray-600 hover:text-amber-700">
          {material.brand ? material.brand : <span className="text-gray-300">—</span>}
        </button>
      </td>
      <td className="py-2 px-2">
        <button onClick={startEditing} className="text-gray-600 hover:text-amber-700">
          {material.supplier?.name ?? <span className="text-gray-300">—</span>}
        </button>
      </td>
      <td className="py-2 px-2 text-center">
        <button onClick={startEditing} className="text-gray-500 hover:text-amber-700">
          {material.unit}
        </button>
      </td>
      <td className="py-2 px-2 text-center">
        <button onClick={startEditing} className="text-gray-600 hover:text-amber-700">
          {shownQty ?? <span className="text-gray-300">—</span>}
        </button>
      </td>
      <td className="py-2 px-2 text-right">
        <button
          onClick={startEditing}
          className="flex items-center gap-1.5 ml-auto text-gray-700 hover:text-amber-700 group"
        >
          <span className={material.currentPrice === 0 ? "text-amber-600 font-medium" : ""}>
            R$ {material.currentPrice.toFixed(2).replace(".", ",")}
          </span>
          <Pencil className="w-3 h-3 text-gray-400 group-hover:text-amber-600" />
        </button>
      </td>
      <td className="py-2 px-2 text-center">
        <button
          onClick={startEditing}
          className="mx-auto flex items-center gap-1.5 text-gray-600 hover:text-amber-700 group"
        >
          {shownDate ? (
            <span>{shownDate}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
          <Pencil className="w-3 h-3 text-gray-400 group-hover:text-amber-600" />
        </button>
      </td>
      <td className="py-2 px-2 text-center">
        <Badge variant={material.active ? "success" : "secondary"}>
          {material.active ? "Ativo" : "Inativo"}
        </Badge>
      </td>
      <td className="py-2 pl-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleActive}
            disabled={isPending}
            className="text-xs"
          >
            {material.active ? "Desativar" : "Ativar"}
          </Button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            title="Excluir material"
            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {error && !editing && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </td>
    </tr>
  );
}
