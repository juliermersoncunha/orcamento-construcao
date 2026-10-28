"use client";

// Tabelas de material por fase com seleção de itens e cópia para mensagem
// (WhatsApp, e-mail) ou para colar no Excel, e marcação do que já foi comprado.

import { useState, useTransition } from "react";
import { Check, FileSpreadsheet, MessageSquare, ShoppingCart } from "lucide-react";
import { setBudgetPurchased, setBudgetPurchaseQuantity } from "@/app/actions/budget-purchases";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ItemOrcamento = {
  // "fase:materialId" — também é a chave da marcação de comprado.
  id: string;
  materialId: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  // Quanto já foi comprado: ausente = nada; null = tudo; número = parcial.
  compra?: number | null;
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

// Compras marcadas: id da linha → quantidade comprada (null = tudo).
type Compras = Map<string, number | null>;

function qtdComprada(i: ItemOrcamento, compras: Compras) {
  if (!compras.has(i.id)) return 0;
  const q = compras.get(i.id);
  return q == null ? i.quantity : Math.min(q, i.quantity);
}
function faltaComprar(i: ItemOrcamento, compras: Compras) {
  return Math.max(0, i.quantity - qtdComprada(i, compras));
}
function compradoInteiro(i: ItemOrcamento, compras: Compras) {
  return compras.has(i.id) && faltaComprar(i, compras) === 0;
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

type Filtro = "todos" | "comprar" | "comprados";

export function ItensPorFase({
  projectId, projeto, fases, hasMO,
}: {
  projectId: string;
  projeto: string;
  fases: FaseOrcamento[];
  hasMO: boolean;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [comPreco, setComPreco] = useState(false);
  const [listaUnica, setListaUnica] = useState(false);
  const [copiado, setCopiado] = useState<"msg" | "excel" | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  // Estado otimista: a marca muda na hora e a ação grava em segundo plano.
  const [compras, setCompras] = useState<Compras>(
    () => new Map(fases.flatMap((f) => f.items.filter((i) => i.compra !== undefined).map((i) => [i.id, i.compra ?? null])))
  );
  const [editandoParcial, setEditandoParcial] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // "A comprar" inclui o parcial (ainda falta); "Comprados" inclui tudo que
  // teve alguma compra.
  const visivel = (i: ItemOrcamento) =>
    filtro === "todos" ||
    (filtro === "comprar" ? !compradoInteiro(i, compras) : compras.has(i.id));
  const todos = fases.flatMap((f) => f.items.filter(visivel).map((i) => i.id));
  const tudoMarcado = todos.length > 0 && todos.every((id) => sel.has(id));

  const itens = fases.flatMap((f) => f.items);
  const valor = (i: ItemOrcamento) => i.quantity * i.unitPrice;
  const qtdAComprar = itens.filter((i) => !compradoInteiro(i, compras)).length;
  const qtdComCompra = itens.filter((i) => compras.has(i.id)).length;
  const totalComprado = itens.reduce((s, i) => s + qtdComprada(i, compras) * i.unitPrice, 0);
  const totalFalta = itens.reduce((s, i) => s + valor(i), 0) - totalComprado;

  function gravar(alterar: (c: Compras) => void, acao: () => Promise<unknown>) {
    const antes = compras;
    const n = new Map(compras);
    alterar(n);
    setCompras(n);
    setErro(null);
    startTransition(async () => {
      try {
        const r = await acao();
        if (r && typeof r === "object" && "error" in r) throw new Error();
      } catch {
        setCompras(antes);
        setErro("Não foi possível salvar a marcação de comprado. Tente de novo.");
      }
    });
  }

  function marcarComprado(ids: string[], comprado: boolean) {
    if (ids.length === 0) return;
    gravar(
      (c) => { for (const id of ids) { if (comprado) c.set(id, null); else c.delete(id); } },
      () => setBudgetPurchased(projectId, ids, comprado)
    );
  }

  function salvarParcial(i: ItemOrcamento, q: number) {
    setEditandoParcial(null);
    gravar(
      (c) => {
        if (q <= 0) c.delete(i.id);
        else c.set(i.id, q >= i.quantity ? null : q);
      },
      () => setBudgetPurchaseQuantity(projectId, i.id, q >= i.quantity ? i.quantity : q)
    );
  }

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

  // No filtro "A comprar" a cópia leva só o que falta de cada item — é a lista
  // para mandar ao fornecedor.
  function selecionadas() {
    const linhas = fases.flatMap((f) =>
      f.items
        .filter((i) => sel.has(i.id))
        .map((i) => ({
          fase: f.label, materialId: i.materialId, name: i.name, unit: i.unit,
          quantity: filtro === "comprar" ? faltaComprar(i, compras) : i.quantity,
          unitPrice: i.unitPrice,
        }))
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
  const selIds = [...sel];
  const selTodaComprada = !nada && itens.filter((i) => sel.has(i.id)).every((i) => compradoInteiro(i, compras));

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
          {([
            ["todos", `Todos (${itens.length})`],
            ["comprar", `A comprar (${qtdAComprar})`],
            ["comprados", `Comprados (${qtdComCompra})`],
          ] as [Filtro, string][]).map(([v, rotulo]) => (
            <button
              key={v}
              type="button"
              onClick={() => { setFiltro(v); setSel(new Set()); }}
              className={`rounded-md px-2.5 py-1 font-medium ${filtro === v ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-600">
          <span className="font-semibold text-green-700">Comprado {formatCurrency(totalComprado)}</span>
          {" · "}
          <span className="font-semibold text-amber-700">Falta comprar {formatCurrency(totalFalta)}</span>
        </span>
        {filtro === "comprar" && (
          <span className="text-xs text-gray-500">a cópia leva só a quantidade que falta</span>
        )}
        {erro && <span className="text-xs text-red-600">{erro}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
          {nada ? "marque itens para copiar ou marcar como comprados" : `${sel.size} de ${todos.length} itens`}
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={nada}
          className="border-green-300 text-green-700 hover:bg-green-50"
          onClick={() => { marcarComprado(selIds, !selTodaComprada); setSel(new Set()); }}
        >
          <ShoppingCart className="w-4 h-4 mr-1" />
          {selTodaComprada ? "Desmarcar comprado" : "Marcar comprado"}
        </Button>
        {!nada && (
          <button type="button" className="text-xs text-gray-500 underline" onClick={() => setSel(new Set())}>
            limpar
          </button>
        )}
      </div>
      </div>

      {fases.map((f) => {
        const visiveis = f.items.filter(visivel);
        if (visiveis.length === 0) return null;
        const ids = visiveis.map((i) => i.id);
        const marcados = ids.filter((id) => sel.has(id)).length;
        const compradosFase = f.items.filter((i) => compradoInteiro(i, compras)).length;
        const parciaisFase = f.items.filter((i) => compras.has(i.id) && !compradoInteiro(i, compras)).length;
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
                  {(compradosFase > 0 || parciaisFase > 0) && (
                    <span className={`text-xs font-medium ${compradosFase === f.items.length ? "text-green-700" : "text-gray-500"}`}>
                      {compradosFase === f.items.length
                        ? "tudo comprado"
                        : `${compradosFase} de ${f.items.length} comprados${parciaisFase ? ` · ${parciaisFase} parcial` : ""}`}
                    </span>
                  )}
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
                      <th className="text-center font-medium text-gray-500 py-2 pl-3 w-40">Comprado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((item) => {
                      const marcado = sel.has(item.id);
                      const comprado = compradoInteiro(item, compras);
                      const parcial = compras.has(item.id) && !comprado;
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
                          <td className={`py-2 pr-4 ${comprado ? "text-gray-400 line-through" : "text-gray-800"}`}>{item.name}</td>
                          <td className="py-2 px-2 text-center font-medium">{formatNumber(item.quantity)}</td>
                          <td className="py-2 px-2 text-center text-gray-500">{item.unit}</td>
                          <td className="py-2 px-2 text-right text-gray-600">
                            {item.unitPrice > 0 ? formatCurrency(item.unitPrice) : <Badge variant="warning">Sem preço</Badge>}
                          </td>
                          <td className="py-2 pl-2 text-right font-semibold text-gray-900">
                            {item.unitPrice > 0 ? formatCurrency(item.quantity * item.unitPrice) : "—"}
                          </td>
                          <td className="py-2 pl-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {editandoParcial === item.id ? (
                              <FormParcial
                                item={item}
                                inicial={parcial ? qtdComprada(item, compras) : undefined}
                                onSalvar={(q) => salvarParcial(item, q)}
                                onCancelar={() => setEditandoParcial(null)}
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                <button
                                  type="button"
                                  aria-pressed={comprado}
                                  aria-label={`${item.name}: ${comprado ? "comprado" : parcial ? "comprado em parte" : "não comprado"}`}
                                  onClick={() => marcarComprado([item.id], !comprado)}
                                  title={parcial ? "Marcar como comprado todo" : undefined}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                                    comprado
                                      ? "border-green-300 bg-green-100 text-green-800"
                                      : parcial
                                        ? "border-amber-300 bg-amber-100 text-amber-800"
                                        : "border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-700"
                                  }`}
                                >
                                  {comprado ? <Check className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
                                  {comprado ? "Comprado" : parcial ? "Parcial" : "Comprar"}
                                </button>
                                {parcial ? (
                                  <button
                                    type="button"
                                    onClick={() => setEditandoParcial(item.id)}
                                    className="text-[11px] leading-tight text-amber-800 hover:underline"
                                    title="Editar a quantidade comprada"
                                  >
                                    comprei {qtd(qtdComprada(item, compras))} · falta {qtd(faltaComprar(item, compras))} {item.unit}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditandoParcial(item.id)}
                                    className="text-[11px] text-gray-400 hover:text-amber-700 hover:underline"
                                  >
                                    {comprado ? "foi só uma parte?" : "comprei só uma parte"}
                                  </button>
                                )}
                              </div>
                            )}
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
                        <td />
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

// Quantidade comprada de um item, quando não foi comprado todo.
function FormParcial({
  item, inicial, onSalvar, onCancelar,
}: {
  item: ItemOrcamento;
  inicial?: number;
  onSalvar: (q: number) => void;
  onCancelar: () => void;
}) {
  const [valor, setValor] = useState(inicial !== undefined ? String(inicial).replace(".", ",") : "");
  const q = Number(valor.replace(",", "."));
  const valido = valor.trim() !== "" && Number.isFinite(q) && q >= 0;
  const falta = valido ? Math.max(0, item.quantity - q) : null;

  return (
    <form
      className="flex flex-col items-center gap-1"
      onSubmit={(e) => { e.preventDefault(); if (valido) onSalvar(q); }}
    >
      <label className="flex items-center gap-1 text-[11px] text-gray-600">
        comprei
        <input
          autoFocus
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onCancelar(); }}
          aria-label={`Quantidade comprada de ${item.name}`}
          className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
        />
        {item.unit}
      </label>
      <span className="text-[11px] text-gray-500">
        {falta === null ? `de ${qtd(item.quantity)} ${item.unit}` : `falta ${qtd(falta)} ${item.unit}`}
      </span>
      <div className="flex gap-2 text-[11px]">
        <button type="submit" disabled={!valido} className="font-medium text-green-700 hover:underline disabled:opacity-40">
          salvar
        </button>
        <button type="button" onClick={onCancelar} className="text-gray-500 hover:underline">
          cancelar
        </button>
      </div>
    </form>
  );
}
