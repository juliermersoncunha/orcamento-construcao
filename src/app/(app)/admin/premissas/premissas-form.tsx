"use client";

import { useState, useTransition } from "react";
import { updateAllPremises } from "@/app/actions/premises";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type Premise = {
  id: string;
  key: string;
  label: string;
  value: number;
  unit: string;
  category: string;
};

type Props = {
  premises: Premise[];
};

const CATEGORY_LABELS: Record<string, string> = {
  ALVENARIA: "Alvenaria",
  CHAPISCO: "Chapisco",
  REBOCO: "Reboco",
  ESTRUTURA: "Estrutura",
  LAJE: "Laje",
  FUNDACAO: "Fundação",
  COBERTURA: "Cobertura",
  REVESTIMENTOS: "Revestimentos",
  PINTURA: "Pintura",
  INSTALACOES: "Instalações",
  MURO: "Muro (perímetro)",
  TERRAPLENAGEM: "Terraplenagem",
};

export function PremissasForm({ premises }: Props) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(premises.map((p) => [p.id, p.value]))
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const byCategory = premises.reduce<Record<string, Premise[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  const categoryOrder = [
    "ALVENARIA", "CHAPISCO", "REBOCO", "ESTRUTURA", "LAJE", "FUNDACAO",
    "COBERTURA", "REVESTIMENTOS", "PINTURA", "INSTALACOES", "MURO", "TERRAPLENAGEM",
  ];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const updates = premises.map((p) => ({ id: p.id, value: values[p.id] ?? p.value }));
    startTransition(async () => {
      await updateAllPremises(updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {categoryOrder
        .filter((cat) => byCategory[cat]?.length > 0)
        .map((cat) => (
          <div key={cat} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2 mb-3">
              {CATEGORY_LABELS[cat] ?? cat}
            </h2>
            <div className="grid grid-cols-1 gap-1">
              {byCategory[cat].map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 py-2 px-3 rounded-lg hover:bg-gray-50"
                >
                  <span className="flex-1 text-sm text-gray-800">{p.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={values[p.id]}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [p.id]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-28 text-right rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <span className="w-20 text-xs text-gray-400">{p.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button type="submit" disabled={isPending}>
          {saved ? (
            <><Check className="w-4 h-4 mr-1" /> Salvo!</>
          ) : isPending ? "Salvando..." : "Salvar Premissas"}
        </Button>
      </div>
    </form>
  );
}
