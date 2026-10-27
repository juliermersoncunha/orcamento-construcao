"use client";

// Tabelas de material por fase com seleção de itens e cópia para mensagem
// (WhatsApp, e-mail) ou para colar no Excel.

import { useState } from "react";
import { Check, FileSpreadsheet, MessageSquare } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ItemOrcamento = {
  id: string;
  materialId: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export type FaseOrcamento = {
  phase: string;
  label: string;
  items: ItemOrcamento[];
  matTotal: number;
  moTotal: number;
};

type Linha = { fase: string; name: string; unit: string; quantity: number; unitPrice: number };

// Número para o Excel em pt-BR: vírgula decimal, sem separador de milhar,
// para a célula entrar como número e não como texto.
function num(n: number, casas = 2) {
  return n.toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: casas });
}
function qtd(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

// O mesmo material pode aparecer em duas linhas da mesma fase (ex.: cimento do
// contrapiso e do reboco). Na cópia, soma por material dentro da fase — ou na
// lista toda, quando "somar" está marcado.
function juntar(linhas: (Linha & { materialId: string })[], porFase: boolean): Linha[] {
  const mapa = new Map<string, Linha>();
  for (const l of linhas) {
    const k = porFase ? `${l.fase}|${l.materialId}` : l.materialId;
    const atual = mapa.get(k);
    if (atual) atual.quantity += l.quantity;
    else mapa.set(k, { fase: porFase ? l.fase : "", name: l.name, unit: l.unit, quantity: l.quantity, unitPrice: l.unitPrice });
  }
  return [...mapa.values()];
}

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export function ItensPorFase({
  projeto, fases, hasMO,
}: {
  projeto: string;
  fases: FaseOrcamento[];
  hasMO: boolean;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [comPreco, setComPreco] = useState(false);
  const [listaUnica, setListaUnica] = useState(false);
  const [copiado, setCopiado] = useState<"msg" | "excel" | null>(null);

  const todos = fases.flatMap((f) => f.items.map((i) => i.id));
  const tudoMarcado = sel.size > 0 && sel.size === todos.length;

  function alternar(ids: string[], marcar: boolean) {
    setSel((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (marcar) n.add(id);
        else n.delete(id);
      }
      return n;
    });
  }

  function selecionadas() {
    const linhas = fases.flatMap((f) =>
      f.items
        .filter((i) => sel.has(i.id))
        .map((i) => ({ fase: f.label, materialId: i.materialId, name: i.name, unit: i.unit, quantity: i.quantity, unitPrice: i.unitPrice }))
    );
    return juntar(linhas, !listaUnica);
  }

  function totalDe(linhas: Linha[]) {
    return linhas.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  }

  async function copiarMensagem() {
    const linhas = selecionadas();
    const item = (l: Linha) =>
      `• ${l.name} — ${qtd(l.quantity)} ${l.unit}` +
      (comPreco && l.unitPrice > 0 ? ` (${formatCurrency(l.unitPrice)} = ${formatCurrency(l.quantity * l.unitPrice)})` : "");
    const partes = [`*Lista de materiais — ${projeto}*`];
    if (listaUnica) {
      partes.push("", ...linhas.map(item));
    } else {
      for (const f of fases) {
        const daFase = linhas.filter((l) => l.fase === f.label);
        if (daFase.length === 0) continue;
        partes.push("", `*${f.label}*`, ...daFase.map(item));
      }
    }
    if (comPreco) partes.push("", `*Total: ${formatCurrency(totalDe(linhas))}*`);
    await copiar(partes.join("\n"));
    avisar("msg");
  }

  async function copiarExcel() {
    const linhas = selecionadas();
    const cab = [...(listaUnica ? [] : ["Etapa"]), "Material", "Qtd", "Un", "Preço unit.", "Total"];
    const corpo = linhas.map((l) => [
      ...(listaUnica ? [] : [l.fase]),
      l.name,
      num(l.quantity),
      l.unit,
      num(l.unitPrice),
      num(l.quantity * l.unitPrice),
    ]);
    const rodape = [...(listaUnica ? [] : [""]), "Total", "", "", "", num(totalDe(linhas))];
    await copiar([cab, ...corpo, rodape].map((r) => r.join("\t")).join("\n"));
    avisar("excel");
  }

  function avisar(qual: "msg" | "excel") {
    setCopiado(qual);
    setTimeout(() => setCopiado(null), 2000);
  }

  const nada = sel.size === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600"
            checked={tudoMarcado}
            ref={(el) => { if (el) el.indeterminate = !nada && !tudoMarcado; }}
            onChange={(e) => alternar(todos, e.target.checked)}
          />
          Selecionar todos
        </label>
        <span className="text-xs text-gray-500">
          {nada ? "marque os itens que quer copiar" : `${sel.size} de ${todos.length} itens`}
        </span>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" className="accent-brand-600" checked={comPreco} onChange={(e) => setComPreco(e.target.checked)} />
          preços na mensagem
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-600" title="Soma o mesmo material de todas as etapas numa linha só">
          <input type="checkbox" className="accent-brand-600" checked={listaUnica} onChange={(e) => setListaUnica(e.target.checked)} />
          lista única (somar etapas)
        </label>
        <Button type="button" size="sm" variant="outline" disabled={nada} onClick={copiarMensagem}>
          {copiado === "msg" ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <MessageSquare className="w-4 h-4 mr-1" />}
          {copiado === "msg" ? "Copiado!" : "Copiar mensagem"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={nada} onClick={copiarExcel}>
          {copiado === "excel" ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <FileSpreadsheet className="w-4 h-4 mr-1" />}
          {copiado === "excel" ? "Copiado! Cole no Excel" : "Copiar p/ Excel"}
        </Button>
        {!nada && (
          <button type="button" className="text-xs text-gray-500 underline" onClick={() => setSel(new Set())}>
            limpar
          </button>
        )}
      </div>

      {fases.map((f) => {
        const ids = f.items.map((i) => i.id);
        const marcados = ids.filter((id) => sel.has(id)).length;
        return (
          <Card key={f.phase}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    aria-label={`Selecionar todos de ${f.label}`}
                    checked={marcados === ids.length}
                    ref={(el) => { if (el) el.indeterminate = marcados > 0 && marcados < ids.length; }}
                    onChange={(e) => alternar(ids, e.target.checked)}
                  />
                  <CardTitle className="text-base">{f.label}</CardTitle>
                </label>
                <div className="flex items-center gap-4 text-sm">
                  {hasMO && f.moTotal > 0 && (
                    <span className="text-gray-500">
                      Mat: {formatCurrency(f.matTotal)} · MO: {formatCurrency(f.moTotal)}
                    </span>
                  )}
                  <span className="text-base font-bold text-amber-700">
                    {formatCurrency(f.matTotal + f.moTotal)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="w-8 py-2" />
                      <th className="text-left font-medium text-gray-500 py-2">Material</th>
                      <th className="text-center font-medium text-gray-500 py-2">Qtd</th>
                      <th className="text-center font-medium text-gray-500 py-2">Un</th>
                      <th className="text-right font-medium text-gray-500 py-2">Preço Unit.</th>
                      <th className="text-right font-medium text-gray-500 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.items.map((item) => {
                      const marcado = sel.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-50 cursor-pointer ${marcado ? "bg-brand-50" : "hover:bg-gray-50"}`}
                          onClick={() => alternar([item.id], !marcado)}
                        >
                          <td className="py-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-brand-600"
                              aria-label={`Selecionar ${item.name}`}
                              checked={marcado}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => alternar([item.id], e.target.checked)}
                            />
                          </td>
                          <td className="py-2 pr-4 text-gray-800">{item.name}</td>
                          <td className="py-2 px-2 text-center font-medium">{formatNumber(item.quantity)}</td>
                          <td className="py-2 px-2 text-center text-gray-500">{item.unit}</td>
                          <td className="py-2 px-2 text-right text-gray-600">
                            {item.unitPrice > 0 ? formatCurrency(item.unitPrice) : <Badge variant="warning">Sem preço</Badge>}
                          </td>
                          <td className="py-2 pl-2 text-right font-semibold text-gray-900">
                            {item.unitPrice > 0 ? formatCurrency(item.quantity * item.unitPrice) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {hasMO && f.moTotal > 0 && (
                      <tr className="border-b border-amber-100 bg-amber-50/50">
                        <td />
                        <td className="py-2 pr-4 text-amber-800 font-medium">Mão de Obra — {f.label}</td>
                        <td colSpan={3}></td>
                        <td className="py-2 pl-2 text-right font-semibold text-amber-700">{formatCurrency(f.moTotal)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
