"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, HardHat, Paintbrush, Zap, Sparkles, MoreHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  setLaborLineValue, updateLaborLineLabel, addLaborLineOutro, deleteLaborLine,
} from "@/app/actions/labor-lines";
import { setProjectCostLine } from "@/app/actions/renovation";
import { calcularBdi } from "@/lib/cost-summary";
import { parseNumeroBR } from "@/lib/utils";

type Linha = { id: string; role: string; label: string | null; value: number };

type GestaoLinha = {
  key: string; label: string; percentual: boolean;
  amount: number; percent: number | null;
};

const ROLE_INFO: Record<string, { label: string; icone: React.ReactNode }> = {
  PEDREIRO:    { label: "Pedreiro",    icone: <HardHat className="w-4 h-4 text-amber-700" /> },
  PINTOR:      { label: "Pintor",      icone: <Paintbrush className="w-4 h-4 text-cyan-700" /> },
  ELETRICISTA: { label: "Eletricista", icone: <Zap className="w-4 h-4 text-yellow-600" /> },
  LIMPEZA:     { label: "Limpeza",     icone: <Sparkles className="w-4 h-4 text-emerald-600" /> },
  OUTRO:       { label: "Outros",      icone: <MoreHorizontal className="w-4 h-4 text-gray-500" /> },
};

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function MaoDeObraForm({
  projectId, linhas, gestao, materiais, adicionalPct = 0,
}: { projectId: string; linhas: Linha[]; gestao: GestaoLinha[]; materiais: number; adicionalPct?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [novoLabel, setNovoLabel] = useState("");
  const [novoValor, setNovoValor] = useState("");

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r && "error" in r && r.error) { setError(r.error); return; }
      router.refresh();
    });
  }

  const totalMO = linhas.reduce((s, l) => s + l.value, 0);
  // Reforma: adicional sobre o material, que também é base do BDI.
  const adicional = (materiais * adicionalPct) / 100;
  // Base dos itens de gestão em %: material + adicional + mão de obra (o
  // mesmo cálculo de lib/cost-summary.ts).
  const baseGestao = materiais + adicional + totalMO;
  const valorDoItem = (g: GestaoLinha) =>
    g.percent && g.percent > 0 ? (baseGestao * g.percent) / 100 : g.amount;
  // BDI incide sobre o custo direto: material + MO + itens de gestão.
  const fixos = gestao.filter((g) => !g.percentual).reduce((s, g) => s + valorDoItem(g), 0);
  const custoDireto = materiais + adicional + totalMO + fixos;
  const bdiItem = gestao.find((g) => g.percentual);
  const bdiValor = calcularBdi(custoDireto, bdiItem?.percent);
  const totalGestao = fixos + bdiValor;
  const total = custoDireto + bdiValor;

  return (
    <Card>
      <CardContent className="py-5 flex flex-col gap-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <ul className="divide-y divide-gray-100">
          {linhas.map((l) => (
            <LinhaMO key={l.id} l={l} isPending={isPending} run={run} />
          ))}
        </ul>

        {/* Novo "Outros" */}
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Adicionar outra função
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={novoLabel}
              onChange={(e) => setNovoLabel(e.target.value)}
              placeholder="descrição (ex.: azulejista, encanador, servente)"
              className="flex-1 min-w-[14rem] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              placeholder="R$"
              inputMode="decimal"
              className="w-28 text-right rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button
              variant="outline" size="sm"
              disabled={isPending || novoLabel.trim().length < 2}
              onClick={() => run(async () => {
                const v = Number(novoValor.replace(",", ".")) || 0;
                const r = await addLaborLineOutro(projectId, novoLabel, v);
                if (!r?.error) { setNovoLabel(""); setNovoValor(""); }
                return r;
              })}
            >
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          </div>
        </div>

        {/* Gestão da obra */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">Gestão da obra</p>
          <ul className="divide-y divide-gray-100">
            {gestao.map((g) => (
              <LinhaGestao
                key={g.key}
                g={g}
                custoDireto={custoDireto}
                baseGestao={baseGestao}
                isPending={isPending}
                run={run}
                projectId={projectId}
              />
            ))}
          </ul>
        </div>

        <div className="border-t border-gray-200 pt-3 flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between text-gray-600">
            <span>Materiais (orçamento)</span><span>{brl(materiais)}</span>
          </div>
          {adicional > 0 && (
            <div className="flex items-center justify-between text-gray-600">
              <span>Adicional de material ({adicionalPct}%)</span><span>{brl(adicional)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-gray-600">
            <span>Mão de obra</span><span>{brl(totalMO)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Gestão da obra</span><span>{brl(totalGestao)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="font-semibold text-gray-800">Total</span>
            <span className="text-lg font-bold text-amber-700">{brl(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LinhaMO({
  l, isPending, run,
}: {
  l: Linha;
  isPending: boolean;
  run: (fn: () => Promise<{ error?: string } | void>) => void;
}) {
  const info = ROLE_INFO[l.role] ?? ROLE_INFO.OUTRO;
  const fixa = l.role !== "OUTRO";
  const [valor, setValor] = useState(l.value ? String(l.value).replace(".", ",") : "");
  const [labelTxt, setLabelTxt] = useState(l.label ?? "");
  const [salvo, setSalvo] = useState(false);

  function salvarValor() {
    const v = parseNumeroBR(valor) || 0;
    if (v !== l.value) {
      run(async () => {
        const r = await setLaborLineValue(l.id, v);
        if (!r?.error) { setSalvo(true); setTimeout(() => setSalvo(false), 1200); }
        return r;
      });
    }
  }
  function salvarLabel() {
    const t = labelTxt.trim();
    if (t.length >= 2 && t !== l.label) {
      run(() => updateLaborLineLabel(l.id, t));
    } else {
      setLabelTxt(l.label ?? "");
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-2.5">
      <span className="shrink-0 w-6">{info.icone}</span>
      {fixa ? (
        <span className="flex-1 min-w-[8rem] text-sm font-medium text-gray-800">{info.label}</span>
      ) : (
        <input
          value={labelTxt}
          onChange={(e) => setLabelTxt(e.target.value)}
          onBlur={salvarLabel}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder="descrição"
          className="flex-1 min-w-[8rem] rounded-md border border-transparent hover:border-gray-300 focus:border-gray-300 bg-transparent px-2 py-1 text-sm font-medium text-gray-800 focus:outline-none"
        />
      )}
      <span className="text-xs text-gray-400">R$</span>
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={salvarValor}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        inputMode="decimal"
        placeholder="0,00"
        className="w-32 text-right rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {salvo && <Check className="w-4 h-4 text-green-600" />}
      <button
        type="button"
        aria-label={fixa ? `Zerar ${info.label}` : "Excluir função"}
        title={fixa ? "Zerar — a função fica na lista" : "Excluir"}
        disabled={isPending}
        onClick={() => {
          const msg = fixa ? `Zerar o valor de ${info.label}?` : `Excluir "${l.label}"?`;
          if (confirm(msg)) run(() => deleteLaborLine(l.id));
        }}
        className="text-gray-300 hover:text-red-600"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}

function LinhaGestao({
  g, custoDireto, baseGestao, isPending, run, projectId,
}: {
  g: GestaoLinha;
  custoDireto: number;
  baseGestao: number;
  isPending: boolean;
  run: (fn: () => Promise<{ error?: string } | void>) => void;
  projectId: string;
}) {
  // BDI é sempre %. Os outros itens escolhem: valor fixo ou % da base
  // (material + mão de obra). O modo nasce do que está gravado.
  const emPctGravado = g.percentual || (g.percent != null && g.percent > 0);
  const [emPct, setEmPct] = useState(emPctGravado);
  const [txt, setTxt] = useState(
    emPctGravado
      ? (g.percent ? String(g.percent).replace(".", ",") : "")
      : (g.amount ? String(g.amount).replace(".", ",") : "")
  );
  const base = g.percentual ? custoDireto : baseGestao;
  const digitado = parseNumeroBR(txt);
  const pctAtual = Number.isFinite(digitado) ? digitado : g.percent ?? 0;
  const calculado = emPct ? (pctAtual * base) / 100 : g.amount;

  function salvar(pct = emPct, texto = txt) {
    const n = parseNumeroBR(texto) || 0;
    if (pct) {
      if (n !== (g.percent ?? 0) || g.amount !== 0) {
        run(() => setProjectCostLine(projectId, { kind: "GESTAO", key: g.key, amount: 0, percent: n }));
      }
    } else if (n !== g.amount || g.percent) {
      run(() => setProjectCostLine(projectId, { kind: "GESTAO", key: g.key, amount: n, percent: null }));
    }
  }

  // Trocar o modo zera o campo: R$ 3.000 não vira 3.000%.
  function trocar(pct: boolean) {
    if (pct === emPct) return;
    setEmPct(pct);
    setTxt("");
    if (g.amount || g.percent) salvar(pct, "");
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-2.5">
      <span className="flex-1 min-w-[8rem] text-sm text-gray-700">
        {g.label}
        {emPct && (
          <span className="text-xs text-gray-400"> — sobre {brl(base)}{!g.percentual && " (material + mão de obra)"}</span>
        )}
      </span>
      {!g.percentual && (
        <div className="flex rounded-full bg-surface p-0.5 text-[11px] font-semibold">
          {([[false, "R$"], [true, "%"]] as const).map(([v, r]) => (
            <button
              key={r}
              type="button"
              disabled={isPending}
              onClick={() => trocar(v)}
              className={`rounded-full px-2.5 py-0.5 ${emPct === v ? "grad-brand text-white" : "text-ink-2"}`}
              aria-pressed={emPct === v}
              title={v ? "Percentual sobre material + mão de obra" : "Valor fixo em reais"}
            >
              {r}
            </button>
          ))}
        </div>
      )}
      <input
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => salvar()}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        inputMode="decimal"
        placeholder={emPct ? "0" : "0,00"}
        disabled={isPending}
        className="w-24 text-right rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <span className="text-xs text-gray-500 w-6">{emPct ? "%" : "R$"}</span>
      {emPct && (
        <span className="text-sm font-medium text-gray-700 w-28 text-right">{brl(calculado)}</span>
      )}
    </li>
  );
}
