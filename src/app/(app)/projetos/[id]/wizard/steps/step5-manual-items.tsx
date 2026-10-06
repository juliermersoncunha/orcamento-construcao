"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveManualPipes } from "@/app/actions/manual-pipes";

import type { ManualGroup } from "@/lib/manual-catalog";

export type ManualMaterial = {
  id: string; name: string; unit: string; currentPrice: number; category: string;
};

type Props = {
  projectId: string;
  title: string;
  description: string;
  saveLabel: string;
  icon: React.ReactNode;
  iconClassName: string;      // cor do quadrado do ícone
  focusRingClassName: string; // cor do foco dos inputs
  groups: ManualGroup[];
  catalogo: ManualMaterial[];
  block: string;
  initialQuantities: Record<string, number>; // materialId → quantity
};

export function Step5ManualItems({
  projectId,
  title,
  description,
  saveLabel,
  icon,
  iconClassName,
  focusRingClassName,
  groups,
  catalogo,
  block,
  initialQuantities,
}: Props) {
  // Só as quantidades dos materiais deste bloco — assim salvar a elétrica não
  // apaga o que foi informado nos tubos (e vice-versa).
  // Itens escolhidos agora, ainda nao salvos. Entram na lista na hora para o
  // usuario digitar a quantidade; ao salvar, viram linha marcada com o bloco.
  const [adicionados, setAdicionados] = useState<ManualMaterial[]>([]);

  const gruposComAdicionados: ManualGroup[] = adicionados.length
    ? [...groups.filter((g) => g.key !== "avulsos"),
       {
         key: "avulsos",
         label: "Adicionados manualmente",
         items: [
           ...(groups.find((g) => g.key === "avulsos")?.items ?? []),
           ...adicionados,
         ],
       }]
    : groups;

  const ownIds = new Set(gruposComAdicionados.flatMap((g) => g.items.map((m) => m.id)));

  const [qty, setQty] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [id, q] of Object.entries(initialQuantities)) {
      if (ownIds.has(id) && q > 0) out[id] = String(q);
    }
    return out;
  });
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function handleSave() {
    const payload: Record<string, number> = {};
    for (const [materialId, raw] of Object.entries(qty)) {
      if (!ownIds.has(materialId)) continue;
      const n = raw.trim() === "" ? 0 : Number(raw.replace(",", "."));
      payload[materialId] = Number.isFinite(n) ? n : 0;
    }
    // Inclui os materiais deste bloco que o usuário zerou/apagou, para que a
    // server action apague a linha correspondente.
    for (const id of ownIds) {
      if (!(id in payload)) payload[id] = 0;
    }
    const novos = adicionados.map((m) => m.id);
    startTransition(async () => {
      await saveManualPipes(projectId, payload, block, novos);
      setAdicionados([]);
      setSavedAt(new Date());
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconClassName}`}>
            {icon}
          </div>
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {gruposComAdicionados.map((group) => (
            <section key={group.key}>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">{group.label}</h3>
              <div className="rounded-lg border border-gray-200 overflow-x-auto">
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
                    {group.items.map((m) => {
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
                              className={`w-24 text-right rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:border-transparent ${focusRingClassName}`}
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

          {/* Item que não está na lista por categoria. Escolhe-se do catálogo
              inteiro; a linha entra no grupo "Adicionados manualmente" e só
              passa a existir no banco quando o bloco for salvo. */}
          <AdicionarItem
            catalogo={catalogo}
            jaNaLista={ownIds}
            focusRingClassName={focusRingClassName}
            onAdicionar={(m) => setAdicionados((prev) => [...prev, m])}
          />

          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {savedAt
                ? `Salvo às ${savedAt.toLocaleTimeString()}`
                : "As quantidades entram no orçamento quando você gerar/regerar na Etapa 9."}
            </p>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              <Save className="w-4 h-4 mr-2" />
              {isPending ? "Salvando…" : saveLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Seletor de material avulso: a lista abre preenchida com o catálogo ativo, do
// mesmo jeito que no cronograma e no consumo, em vez de exigir o nome exato.
function AdicionarItem({
  catalogo, jaNaLista, focusRingClassName, onAdicionar,
}: {
  catalogo: ManualMaterial[];
  jaNaLista: Set<string>;
  focusRingClassName: string;
  onAdicionar: (m: ManualMaterial) => void;
}) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);

  const disponiveis = catalogo.filter((m) => !jaNaLista.has(m.id));
  const q = busca.trim().toLowerCase();
  const achados = (q ? disponiveis.filter((m) => m.name.toLowerCase().includes(q)) : disponiveis).slice(0, 30);

  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
      <label className="text-xs font-medium text-gray-600">
        Incluir item que não está na lista
      </label>
      <div className="relative mt-1">
        <input
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setAberto(true); }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          placeholder="Clique para ver os materiais cadastrados…"
          autoComplete="off"
          className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${focusRingClassName}`}
        />
        {aberto && achados.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg divide-y divide-gray-100">
            {achados.map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onAdicionar(m); setBusca(""); setAberto(false); }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="text-gray-800">{m.name}</span>
                <span className="shrink-0 text-xs text-gray-500">{m.unit}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        O item entra na lista acima para você informar a quantidade. Ele só é
        gravado quando salvar o bloco.
      </p>
    </div>
  );
}
