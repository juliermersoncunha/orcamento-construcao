"use client";

import { useState, useTransition } from "react";
import { updateSupplier, toggleSupplierActive, deleteSupplier } from "@/app/actions/suppliers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil, Trash2 } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  active: boolean;
  materialCount: number;
};

export function SupplierRow({ supplier }: { supplier: Supplier }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(supplier.name);
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [notes, setNotes] = useState(supplier.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEditing() {
    setName(supplier.name);
    setPhone(supplier.phone ?? "");
    setNotes(supplier.notes ?? "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    if (name.trim().length < 2) {
      setError("Nome obrigatório.");
      return;
    }
    startTransition(async () => {
      const result = await updateSupplier(supplier.id, { name, phone, notes });
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

  function handleDelete() {
    if (!confirm(`Excluir "${supplier.name}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteSupplier(supplier.id);
      if (result?.error) setError(result.error);
    });
  }

  const inputClass =
    "rounded border border-amber-400 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

  if (editing) {
    return (
      <tr className="border-b border-gray-50 bg-amber-50/40">
        <td className="py-2 pr-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            className={`w-full ${inputClass}`}
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </td>
        <td className="py-2 px-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="(00) 00000-0000"
            className={`w-40 ${inputClass}`}
          />
        </td>
        <td className="py-2 px-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="observação"
            className={`w-full ${inputClass}`}
          />
        </td>
        <td className="py-2 px-2 text-center text-gray-500">{supplier.materialCount}</td>
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
            <button onClick={cancel} title="Cancelar" className="p-1 rounded text-gray-400 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
        <td className="py-2 pl-2" />
      </tr>
    );
  }

  return (
    <tr className={`border-b border-gray-50 ${!supplier.active ? "opacity-40" : ""}`}>
      <td className="py-2 pr-4">
        <button
          onClick={startEditing}
          className="flex items-center gap-1.5 text-left text-gray-800 hover:text-amber-700 group"
        >
          <span>{supplier.name}</span>
          <Pencil className="w-3 h-3 text-gray-400 group-hover:text-amber-600 shrink-0" />
        </button>
      </td>
      <td className="py-2 px-2">
        <button onClick={startEditing} className="text-gray-600 hover:text-amber-700">
          {supplier.phone ? supplier.phone : <span className="text-gray-300">—</span>}
        </button>
      </td>
      <td className="py-2 px-2">
        <button onClick={startEditing} className="text-left text-gray-600 hover:text-amber-700">
          {supplier.notes ? supplier.notes : <span className="text-gray-300">—</span>}
        </button>
      </td>
      <td className="py-2 px-2 text-center text-gray-600">{supplier.materialCount}</td>
      <td className="py-2 px-2 text-center">
        <Badge variant={supplier.active ? "success" : "secondary"}>
          {supplier.active ? "Ativo" : "Inativo"}
        </Badge>
      </td>
      <td className="py-2 pl-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startTransition(() => toggleSupplierActive(supplier.id, !supplier.active))}
            disabled={isPending}
            className="text-xs"
          >
            {supplier.active ? "Desativar" : "Ativar"}
          </Button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            title="Excluir fornecedor"
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
