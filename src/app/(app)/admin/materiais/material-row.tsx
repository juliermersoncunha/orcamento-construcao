"use client";

import { useState, useTransition } from "react";
import { updateMaterialPrice, toggleMaterialActive } from "@/app/actions/materials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil } from "lucide-react";

export function MaterialRow({ material }: { material: any }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(material.currentPrice));
  const [isPending, startTransition] = useTransition();

  function savePrice() {
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) return;
    startTransition(async () => {
      await updateMaterialPrice(material.id, p);
      setEditing(false);
    });
  }

  function toggleActive() {
    startTransition(() => toggleMaterialActive(material.id, !material.active));
  }

  return (
    <tr className={`border-b border-gray-50 ${!material.active ? "opacity-40" : ""}`}>
      <td className="py-2 pr-4 text-gray-800">{material.name}</td>
      <td className="py-2 px-2 text-center text-gray-500">{material.unit}</td>
      <td className="py-2 px-2 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.01"
              min="0"
              className="w-24 text-right rounded border border-amber-400 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") savePrice();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <button
              onClick={savePrice}
              disabled={isPending}
              className="p-1 rounded text-green-600 hover:bg-green-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="p-1 rounded text-gray-400 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 ml-auto text-gray-700 hover:text-amber-700 group"
          >
            <span className={material.currentPrice === 0 ? "text-amber-600 font-medium" : ""}>
              R$ {material.currentPrice.toFixed(2).replace(".", ",")}
            </span>
            <Pencil className="w-3 h-3 text-gray-400 group-hover:text-amber-600" />
          </button>
        )}
      </td>
      <td className="py-2 px-2 text-center">
        <Badge variant={material.active ? "success" : "secondary"}>
          {material.active ? "Ativo" : "Inativo"}
        </Badge>
      </td>
      <td className="py-2 pl-2 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleActive}
          disabled={isPending}
          className="text-xs"
        >
          {material.active ? "Desativar" : "Ativar"}
        </Button>
      </td>
    </tr>
  );
}
