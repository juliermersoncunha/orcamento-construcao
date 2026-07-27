"use client";

import { useState, useTransition } from "react";
import { Wrench, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PIPE_GROUPS } from "@/lib/pipes-catalog";
import { saveManualPipes } from "@/app/actions/manual-pipes";

// { name → { id, unit, currentPrice } } — só o que existe no catálogo entra na UI.
export type PipeMaterial = { id: string; name: string; unit: string; currentPrice: number };

type Props = {
  projectId: string;
  materialsByName: Record<string, PipeMaterial>;
  initialQuantities: Record<string, number>; // materialId → quantity
};

export function Step5ManualPipes({ projectId, materialsByName, initialQuantities }: Props) {
  const [qty, setQty] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [id, q] of Object.entries(initialQuantities)) {
      out[id] = q > 0 ? String(q) : "";
    }
    return out;
  });
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function handleSave() {
    const payload: Record<string, number> = {};
    for (const [materialId, raw] of Object.entries(qty)) {
      const n = raw.trim() === "" ? 0 : Number(raw.replace(",", "."));
      payload[materialId] = Number.isFinite(n) ? n : 0;
    }
    // Inclui materiais que o usuário zerou/apagou para que a server action apague a linha
    for (const g of PIPE_GROUPS) {
      for (const it of g.items) {
        const m = materialsByName[it.name];
        if (m && !(m.id in payload)) payload[m.id] = 0;
      }
    }
    startTransition(async () => {
      await saveManualPipes(projectId, payload);
      setSavedAt(new Date());
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-cyan-700" />
          </div>
          <CardTitle>Tubos e conexões — entrada manual</CardTitle>
        </div>
        <CardDescription>
          O sistema não estima metragem de tubos nem quantidade de conexões.
          Informe as quantidades que o projeto vai consumir; deixe em branco os itens que não usar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {PIPE_GROUPS.map((group) => (
            <section key={group.key}>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">{group.label}</h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">Material</th>
                      <th className="text-left py-2 px-3 font-medium w-16">Unid.</th>
                      <th className="text-right py-2 px-3 font-medium w-28">Preço</th>
                      <th className="text-right py-2 px-3 font-medium w-32">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((it) => {
                      const m = materialsByName[it.name];
                      if (!m) {
                        return (
                          <tr key={it.name} className="border-t border-gray-200 text-gray-400">
                            <td className="py-2 px-3">{it.name}</td>
                            <td className="py-2 px-3">{it.unit}</td>
                            <td className="py-2 px-3 text-right">—</td>
                            <td className="py-2 px-3 text-right italic">material fora do catálogo</td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={m.id} className="border-t border-gray-200">
                          <td className="py-2 px-3 text-gray-800">{m.name}</td>
                          <td className="py-2 px-3 text-gray-600">{m.unit}</td>
                          <td className="py-2 px-3 text-right text-gray-600">
                            {m.currentPrice > 0
                              ? `R$ ${m.currentPrice.toFixed(2).replace(".", ",")}`
                              : <span className="text-amber-600">R$ 0</span>}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={qty[m.id] ?? ""}
                              onChange={(e) => setQty((q) => ({ ...q, [m.id]: e.target.value }))}
                              placeholder="0"
                              className="w-24 text-right rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {savedAt
                ? `Salvo às ${savedAt.toLocaleTimeString()}`
                : "As quantidades entram no orçamento quando você gerar/regerar na Etapa 8."}
            </p>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              <Save className="w-4 h-4 mr-2" />
              {isPending ? "Salvando…" : "Salvar tubos e conexões"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
