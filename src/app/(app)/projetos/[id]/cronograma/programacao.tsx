"use client";

import { useMemo, useState } from "react";
import { X, RotateCcw, Sparkles, Trash2, CalendarRange, ShoppingCart, Copy, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dataBR, segundaISO } from "@/lib/schedule-weeks";
import {
  semanasDoPeriodo, semanasPorEtapa, materiaisDaSemana, type PlanStage, type WeekOverride,
} from "@/lib/schedule-plan";
import {
  toggleWeekStage, setWeekMaterial, suggestWeekPlan, clearWeekPlan, toggleWeekPurchase, replaceWeekMaterial, setWeekMaterialOrigin,
} from "@/app/actions/schedule";

type Run = (fn: () => Promise<{ error?: string } | void>) => void;

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

type LinhaCompra = { name: string; unit: string; quantity: number; semanas: string[] };

// Texto puro: a lista costuma ir por WhatsApp para quem vai comprar.
async function copiarTexto(linhas: LinhaCompra[]): Promise<boolean> {
  const txt = linhas.map((l) => `${l.name} — ${fmt(l.quantity)} ${l.unit}`).join(String.fromCharCode(10));
  try {
    await navigator.clipboard.writeText(txt);
    return true;
  } catch {
    alert("Não consegui copiar. Selecione o texto da lista manualmente.");
    return false;
  }
}

export function Programacao({
  projectId, inicio, fim, stages, weekStages, weekMaterials, weekPurchases, catalogo, isPending, run,
}: {
  projectId: string;
  weekPurchases: string[];
  inicio: string | null;
  fim: string | null;
  stages: PlanStage[];
  weekStages: { stageId: string; weekStart: string }[];
  weekMaterials: (WeekOverride & { weekStart: string })[];
  catalogo: { id: string; name: string; unit: string }[];
  isPending: boolean;
  run: Run;
}) {
  const [verPassadas, setVerPassadas] = useState(false);

  // Comprado: gravado por linha da semana. O visual anda na frente do
  // servidor, como no passo a passo — marca-se várias linhas em sequência.
  const [otimCompra, setOtimCompra] = useState<Record<string, boolean>>({});
  const compradosSet = useMemo(() => new Set(weekPurchases), [weekPurchases]);
  const comprado = (chave: string) => otimCompra[chave] ?? compradosSet.has(chave);
  function alternarCompra(semana: string, materialId: string, valor: boolean, quantidade: number) {
    const chave = `${semana}|${materialId}`;
    setOtimCompra((o) => ({ ...o, [chave]: valor }));
    run(async () => {
      const r = await toggleWeekPurchase(projectId, semana, materialId, valor, quantidade);
      setOtimCompra((o) => {
        const { [chave]: _x, ...resto } = o;
        return resto;
      });
      return r;
    });
  }

  // Seleção para a lista de compras. Vale entre semanas: dá para juntar a
  // compra de duas semanas numa ida só à loja.
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [listaAberta, setListaAberta] = useState(false);
  const [copiado, setCopiado] = useState(false);
  function alternarSelecao(chave: string) {
    setSelecao((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave); else next.add(chave);
      return next;
    });
  }

  const semanas = useMemo(() => semanasDoPeriodo(inicio, fim), [inicio, fim]);
  const porEtapa = useMemo(() => semanasPorEtapa(weekStages), [weekStages]);
  const semanaAtual = segundaISO(hojeISO());

  if (!inicio || !fim) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CalendarRange className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Informe o <strong>início da obra</strong> e o <strong>fim previsto</strong> acima.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            O período vira uma grade de semanas, e em cada semana você inclui as etapas.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (semanas.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-red-700">
          O fim previsto está antes do início da obra.
        </CardContent>
      </Card>
    );
  }

  const visiveis = verPassadas ? semanas : semanas.filter((w) => w >= semanaAtual);
  const ocultas = semanas.length - visiveis.length;

  // Lista de compras: o mesmo material vindo de semanas diferentes vira uma
  // linha só, somada — na loja importa o total.
  const listaCompras: LinhaCompra[] = (() => {
    const acc = new Map<string, LinhaCompra>();
    for (const semana of semanas) {
      const overrides = weekMaterials.filter((m) => m.weekStart === semana);
      for (const m of materiaisDaSemana(semana, stages, porEtapa, overrides)) {
        if (!selecao.has(`${semana}|${m.materialId}`) || m.quantity <= 0) continue;
        const l = acc.get(m.materialId) ?? { name: m.name, unit: m.unit, quantity: 0, semanas: [] };
        l.quantity += m.quantity;
        l.semanas.push(semana);
        acc.set(m.materialId, l);
      }
    }
    return [...acc.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  })();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-gray-600">
          <strong>{semanas.length}</strong> semanas · {weekStages.length === 0 ? "nenhuma etapa programada" : `${new Set(weekStages.map((w) => w.stageId)).size} de ${stages.length} etapas programadas`}
        </span>
        <div className="flex-1" />
        {weekStages.length === 0 ? (
          <Button
            variant="outline" size="sm" disabled={isPending}
            onClick={() => run(() => suggestWeekPlan(projectId))}
            title="Distribui as etapas pelas semanas seguindo a ordem e a duração do cronograma"
          >
            <Sparkles className="w-4 h-4" />
            Sugerir a partir do cronograma
          </Button>
        ) : (
          <Button
            variant="ghost" size="sm" disabled={isPending}
            onClick={() => {
              if (confirm("Apagar toda a programação semanal, inclusive as revisões de material?")) {
                run(() => clearWeekPlan(projectId));
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
            Limpar programação
          </Button>
        )}
        {semanas.some((w) => w < semanaAtual) && (
          <label className="flex items-center gap-1.5 text-gray-600">
            <input type="checkbox" checked={verPassadas} onChange={(e) => setVerPassadas(e.target.checked)} />
            mostrar semanas passadas
          </label>
        )}
      </div>

      {selecao.size === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
          <span>
            Marque a coluna do carrinho para montar uma lista de compras — pode juntar
            mais de uma semana. Ou use “Copiar o que falta” no cabeçalho de cada semana.
          </span>
        </div>
      ) : (
        <Card className="border-brand-300 bg-brand-50 sticky top-4 z-20 shadow-md">
          <CardContent className="py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <ShoppingCart className="w-4 h-4 text-brand-600 shrink-0" />
              <span className="text-sm text-gray-800">
                <strong>{selecao.size}</strong> {selecao.size === 1 ? "linha selecionada" : "linhas selecionadas"}
                {listaCompras.length !== selecao.size && (
                  <span className="text-gray-500"> · {listaCompras.length} materiais distintos</span>
                )}
              </span>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => setListaAberta((v) => !v)}>
                {listaAberta ? "Ocultar lista" : "Ver lista de compras"}
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={async () => {
                  if (await copiarTexto(listaCompras)) {
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2000);
                  }
                }}
              >
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiado ? "Copiado" : "Copiar lista"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setSelecao(new Set()); setListaAberta(false); }}>
                <X className="w-4 h-4" />
                Limpar
              </Button>
            </div>
            {listaAberta && (
              <table className="w-full text-sm bg-white rounded-md mt-3">
                <tbody>
                  {listaCompras.map((l) => (
                    <tr key={l.name + l.unit} className="border-b border-gray-100">
                      <td className="py-1.5 px-2 text-gray-800">{l.name}</td>
                      <td className="py-1.5 text-right w-24 font-medium">{fmt(l.quantity)}</td>
                      <td className="py-1.5 text-center w-14 text-gray-500">{l.unit}</td>
                      <td className="py-1.5 px-2 text-xs text-gray-500">
                        {l.semanas.map((w) => `S${semanas.indexOf(w) + 1}`).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {ocultas > 0 && !verPassadas && (
        <p className="text-xs text-gray-400">{ocultas} semana(s) anterior(es) oculta(s).</p>
      )}

      {visiveis.map((semana) => (
        <SemanaCard
          key={semana}
          projectId={projectId}
          numero={semanas.indexOf(semana) + 1}
          semana={semana}
          rotulo={semana === semanaAtual ? "esta semana" : semana === nextWeek(semanaAtual) ? "próxima semana" : null}
          stages={stages}
          porEtapa={porEtapa}
          overrides={weekMaterials.filter((m) => m.weekStart === semana)}
          catalogo={catalogo}
          isPending={isPending}
          run={run}
          comprado={comprado}
          alternarCompra={alternarCompra}
          selecao={selecao}
          alternarSelecao={alternarSelecao}
        />
      ))}
    </div>
  );
}

function nextWeek(seg: string) {
  const d = new Date(`${seg}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

function SemanaCard({
  projectId, numero, semana, rotulo, stages, porEtapa, overrides, catalogo, isPending, run,
  comprado, alternarCompra, selecao, alternarSelecao,
}: {
  comprado: (chave: string) => boolean;
  alternarCompra: (semana: string, materialId: string, valor: boolean, quantidade: number) => void;
  selecao: Set<string>;
  alternarSelecao: (chave: string) => void;
  projectId: string;
  numero: number;
  semana: string;
  rotulo: string | null;
  stages: PlanStage[];
  porEtapa: Map<string, string[]>;
  overrides: WeekOverride[];
  catalogo: { id: string; name: string; unit: string }[];
  isPending: boolean;
  run: Run;
}) {
  const nestaSemana = stages.filter((s) => (porEtapa.get(s.id) ?? []).includes(semana));
  const fora = stages.filter((s) => !(porEtapa.get(s.id) ?? []).includes(semana));
  const materiais = materiaisDaSemana(semana, stages, porEtapa, overrides);
  const domingo = nextWeek(semana);
  const fimSemana = new Date(`${domingo}T12:00:00Z`);
  fimSemana.setUTCDate(fimSemana.getUTCDate() - 1);

  const jaNaLista = new Set(materiais.map((m) => m.materialId));
  const chave = (materialId: string) => `${semana}|${materialId}`;
  const faltam = materiais.filter((m) => m.quantity > 0 && !comprado(chave(m.materialId)));
  const [copiouSemana, setCopiouSemana] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [verExcluidos, setVerExcluidos] = useState(false);
  // Linha vinda das etapas e zerada pelo usuário = excluída da semana. Sai da
  // lista principal e fica recolhida no fim, com opção de restaurar.
  const excluido = (m: { revisado: boolean; quantity: number; etapas: string[] }) =>
    m.revisado && m.quantity === 0 && m.etapas.length > 0;
  const ativos = materiais.filter((m) => !excluido(m));
  const excluidos = materiais.filter(excluido);

  function excluir(m: { materialId: string; name: string; etapas: string[] }) {
    const foiComprado = comprado(chave(m.materialId));
    const aviso = foiComprado
      ? `"${m.name}" está marcado como comprado. Excluir também retira a compra do estoque. Continuar?`
      : `Excluir "${m.name}" desta semana?`;
    if (!confirm(aviso)) return;
    run(async () => {
      if (foiComprado) {
        const r: { error?: string } = await toggleWeekPurchase(projectId, semana, m.materialId, false);
        if (r.error) return r;
      }
      return setWeekMaterial(projectId, semana, m.materialId, m.etapas.length > 0 ? 0 : null);
    });
  }

  return (
    <Card className={rotulo === "próxima semana" ? "border-brand-300 ring-1 ring-brand-200" : ""}>
      <CardContent className="py-4">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="rounded-md bg-brand-600 px-2 py-1 text-xs font-bold text-white">Semana {numero}</span>
          <span className="text-sm text-gray-600">
            {dataBR(semana)} a {dataBR(fimSemana.toISOString().slice(0, 10))}
          </span>
          {rotulo && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">{rotulo}</span>
          )}
          <div className="flex-1" />
          {faltam.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                if (await copiarTexto(faltam.map((m) => ({ name: m.name, unit: m.unit, quantity: m.quantity, semanas: [semana] })))) {
                  setCopiouSemana(true);
                  setTimeout(() => setCopiouSemana(false), 2000);
                }
              }}
              className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900"
              title="Copia, em texto, o material desta semana que ainda não foi comprado"
            >
              {copiouSemana ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiouSemana ? "Copiado" : `Copiar o que falta (${faltam.length})`}
            </button>
          )}
        </div>

        {/* Etapas da semana */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {nestaSemana.map((s) => {
            const total = (porEtapa.get(s.id) ?? []).length;
            return (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 rounded-md bg-brand-50 border border-brand-200 pl-2 pr-1 py-1 text-sm text-brand-900"
                title={total > 1 ? `Esta etapa está em ${total} semanas — o material dela é repartido entre elas` : undefined}
              >
                {s.name}
                {total > 1 && <span className="text-[11px] text-brand-500">1/{total}</span>}
                <button
                  type="button"
                  aria-label={`Tirar ${s.name} desta semana`}
                  disabled={isPending}
                  onClick={() => run(() => toggleWeekStage(projectId, s.id, semana, false))}
                  className="text-brand-400 hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            );
          })}
          <select
            value=""
            disabled={isPending || fora.length === 0}
            onChange={(e) => {
              const id = e.target.value;
              if (id) run(() => toggleWeekStage(projectId, id, semana, true));
            }}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
          >
            <option value="">+ incluir etapa…</option>
            {fora.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Material da semana */}
        {ativos.length > 0 || excluidos.length > 0 ? (
          <table className="w-full text-sm mb-2">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="text-center font-medium py-1 w-9" title="Já comprado">✓</th>
                <th className="text-center font-medium py-1 w-9" title="Incluir na lista de compras">
                  <ShoppingCart className="w-3.5 h-3.5 inline text-gray-400" />
                </th>
                <th className="text-left font-medium py-1">Material</th>
                <th className="text-right font-medium py-1 w-28">Qtd</th>
                <th className="text-center font-medium py-1 w-14">Un</th>
                <th className="text-left font-medium py-1 pl-3">Origem</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {ativos.map((m) => editando === m.materialId ? (
                <EdicaoLinha
                  key={m.materialId}
                  m={m}
                  catalogo={catalogo}
                  ocupados={new Set(materiais.map((x) => x.materialId))}
                  isPending={isPending}
                  onCancelar={() => setEditando(null)}
                  onSalvar={(newMaterialId, quantity) => run(async () => {
                    const r = await replaceWeekMaterial(projectId, semana, {
                      oldMaterialId: m.materialId,
                      oldFromStages: m.etapas.length > 0,
                      newMaterialId,
                      quantity,
                    });
                    if (!r?.error) setEditando(null);
                    return r;
                  })}
                />
              ) : (
                <tr key={m.materialId} className={`border-b border-gray-100 ${m.quantity === 0 ? "text-gray-400" : ""}`}>
                  <td className="py-1 text-center">
                    <input
                      type="checkbox"
                      checked={comprado(chave(m.materialId))}
                      onChange={(e) => alternarCompra(semana, m.materialId, e.target.checked, m.quantity)}
                      title="Já comprado"
                      className="w-4 h-4 rounded accent-green-600"
                    />
                  </td>
                  <td className="py-1 text-center">
                    <input
                      type="checkbox"
                      checked={selecao.has(chave(m.materialId))}
                      onChange={() => alternarSelecao(chave(m.materialId))}
                      title="Incluir na lista de compras"
                      className="w-4 h-4 rounded accent-brand-600"
                    />
                  </td>
                  <td className={`py-1 ${m.quantity === 0 || comprado(chave(m.materialId)) ? "line-through text-gray-400" : "text-gray-800"}`}>{m.name}</td>
                  <td
                    className={`py-1 text-right pr-1 ${m.revisado ? "text-amber-700 font-medium" : ""}`}
                    title={m.revisado ? `Revisado à mão — o cálculo daria ${fmt(m.auto)}` : "Calculado a partir das etapas da semana"}
                  >
                    {fmt(m.quantity)}
                  </td>
                  <td className="py-1 text-center text-gray-500">{m.unit}</td>
                  <td className="py-1 pl-3">
                    <select
                      value={m.origemId ?? ""}
                      disabled={isPending}
                      onChange={(e) => run(() => setWeekMaterialOrigin(projectId, semana, {
                        materialId: m.materialId,
                        stageId: e.target.value || null,
                        quantity: m.quantity,
                        autoQuantity: Math.round(m.auto * 100) / 100,
                        fromStages: m.auto > 0,
                      }))}
                      title="Etapa de origem deste material"
                      className={`max-w-[15rem] truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-gray-300 focus:border-gray-300 focus:outline-none ${
                        m.origemId ? "text-gray-700" : "text-gray-400"
                      }`}
                    >
                      <option value="">
                        {m.auto > 0 ? `automático${m.origemId ? "" : ` — ${m.etapas.join(", ")}`}` : "acrescentado à mão"}
                      </option>
                      <optgroup label="Etapas desta semana">
                        {nestaSemana.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </optgroup>
                      <optgroup label="Outras etapas">
                        {fora.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </optgroup>
                    </select>
                  </td>
                  <td className="py-1 text-right whitespace-nowrap">
                    {m.revisado && m.etapas.length > 0 && (
                      <button
                        type="button"
                        aria-label="Voltar ao valor calculado"
                        title={`Voltar ao calculado (${fmt(m.auto)})`}
                        disabled={isPending}
                        onClick={() => run(() => setWeekMaterial(projectId, semana, m.materialId, null))}
                        className="mr-2 text-gray-400 hover:text-brand-600"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Editar ${m.name}`}
                      onClick={() => setEditando(m.materialId)}
                      className="mr-2 text-gray-400 hover:text-brand-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Excluir ${m.name} desta semana`}
                      disabled={isPending}
                      onClick={() => excluir(m)}
                      className="text-gray-300 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {excluidos.length > 0 && (
                <tr>
                  <td colSpan={7} className="pt-2 text-xs text-gray-500">
                    <button type="button" onClick={() => setVerExcluidos((v) => !v)} className="underline hover:text-gray-700">
                      {verExcluidos ? "Ocultar" : "Mostrar"} {excluidos.length} {excluidos.length === 1 ? "item excluído" : "itens excluídos"} desta semana
                    </button>
                  </td>
                </tr>
              )}
              {verExcluidos && excluidos.map((m) => (
                <tr key={`exc-${m.materialId}`} className="border-b border-gray-100 text-gray-400">
                  <td colSpan={2} />
                  <td className="py-1 line-through">{m.name}</td>
                  <td className="py-1 text-right pr-1">0</td>
                  <td className="py-1 text-center">{m.unit}</td>
                  <td className="py-1 pl-3 text-xs">{m.etapas.join(", ")}</td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => run(() => setWeekMaterial(projectId, semana, m.materialId, null))}
                      className="flex items-center gap-1 ml-auto text-xs text-brand-600 hover:text-brand-800"
                      title={`Restaurar com o valor calculado (${fmt(m.auto)})`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> restaurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-gray-400 mb-2">
            {nestaSemana.length === 0
              ? "Nenhuma etapa nesta semana."
              : "As etapas desta semana não têm material lançado."}
          </p>
        )}

        <select
          value=""
          disabled={isPending}
          onChange={(e) => {
            const id = e.target.value;
            if (id) run(() => setWeekMaterial(projectId, semana, id, 1));
          }}
          className="rounded-md border border-dashed border-gray-300 bg-white px-2 py-1 text-xs text-gray-600"
        >
          <option value="">+ acrescentar material nesta semana…</option>
          {catalogo.filter((c) => !jaNaLista.has(c.id)).map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}

// Linha da semana em edição: material e quantidade. A lista de materiais não
// oferece os que já estão na semana, para a troca não juntar duas linhas.
function EdicaoLinha({
  m, catalogo, ocupados, isPending, onCancelar, onSalvar,
}: {
  m: { materialId: string; name: string; unit: string; quantity: number };
  catalogo: { id: string; name: string; unit: string }[];
  ocupados: Set<string>;
  isPending: boolean;
  onCancelar: () => void;
  onSalvar: (materialId: string, quantity: number) => void;
}) {
  const [materialId, setMaterialId] = useState(m.materialId);
  const [qtd, setQtd] = useState(String(m.quantity));
  const n = Number(qtd.replace(",", "."));
  const valido = Number.isFinite(n) && n > 0;
  const unit = catalogo.find((c) => c.id === materialId)?.unit ?? m.unit;
  const opcoes = catalogo.filter((c) => c.id === m.materialId || !ocupados.has(c.id));
  const campo = "rounded border border-gray-300 px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <tr className="border-b border-brand-200 bg-brand-50/40">
      <td colSpan={2} />
      <td className="py-1 pr-2">
        <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={`w-full bg-white ${campo}`}>
          {opcoes.some((c) => c.id === m.materialId) ? null : <option value={m.materialId}>{m.name}</option>}
          {opcoes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td className="py-1 text-right">
        <input
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
          inputMode="decimal"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && valido) onSalvar(materialId, n); if (e.key === "Escape") onCancelar(); }}
          className={`w-24 text-right ${campo}`}
        />
      </td>
      <td className="py-1 text-center text-gray-500">{unit}</td>
      <td />
      <td className="py-1 text-right whitespace-nowrap">
        <button
          type="button"
          aria-label="Salvar"
          disabled={!valido || isPending}
          onClick={() => onSalvar(materialId, n)}
          className="mr-2 text-green-600 hover:text-green-800 disabled:opacity-40"
        >
          <Check className="w-4 h-4" />
        </button>
        <button type="button" aria-label="Cancelar" onClick={onCancelar} className="text-gray-400 hover:text-gray-700">
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
