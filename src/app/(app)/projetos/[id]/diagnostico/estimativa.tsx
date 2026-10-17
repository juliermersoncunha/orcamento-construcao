"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProjectCostLine } from "@/app/actions/renovation";
import type { Estimativa } from "@/lib/renovation-estimate";

// Painel da estimativa. Na tela os valores são editáveis e aparece o material
// calculado ao lado, como referência. Na impressão fica só o quadro fechado:
// ofício e valor — é o que vai para o cliente.

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PainelEstimativa({ projectId, est }: { projectId: string; est: Estimativa }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function salvar(kind: "SERVICO" | "GESTAO", key: string, amount: number, percent: number | null = null) {
    startTransition(async () => {
      await setProjectCostLine(projectId, { kind, key, amount, percent });
      router.refresh();
    });
  }

  const campo =
    "w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <section className="mb-6">
      <h2 className="text-base font-bold mb-2">Investimento estimado</h2>

      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            <th className="py-1">Serviço</th>
            <th className="py-1 text-right w-32 print:hidden">Material</th>
            <th className="py-1 text-right w-36">Valor</th>
          </tr>
        </thead>
        <tbody>
          {est.servicos.map((l) => (
            <tr key={l.categoria} className="border-b border-gray-100 align-top">
              <td className="py-1.5">
                <p className="font-medium">{l.categoria}</p>
                <p className="text-xs text-gray-500">{l.servicos.join(" · ")}</p>
              </td>
              <td className="py-1.5 text-right text-gray-500 print:hidden">
                {l.material > 0 ? brl(l.material) : "—"}
              </td>
              <td className="py-1.5 text-right">
                <span className="print:hidden">
                  <ValorEditavel
                    valor={l.estimado}
                    disabled={isPending}
                    onSalvar={(v) => salvar("SERVICO", l.categoria, v)}
                    className={campo}
                  />
                </span>
                {/* No papel não vai caixa de formulário, e serviço sem valor
                    diz "a definir" — "R$ 0,00" leria como serviço de graça. */}
                <span className="hidden print:inline">
                  {l.estimado > 0 ? brl(l.estimado) : "a definir"}
                </span>
              </td>
            </tr>
          ))}
          <tr className="border-b border-gray-200 font-semibold">
            <td className="py-1.5">Subtotal dos serviços</td>
            <td className="py-1.5 text-right text-gray-500 print:hidden">{brl(est.materialTotal)}</td>
            <td className="py-1.5 text-right">{brl(est.totalServicos)}</td>
          </tr>

          {est.gestao.map((g) => (
            <tr
              key={g.key}
              className={`border-b border-gray-100 ${g.calculado === 0 ? "print:hidden" : ""}`}
            >
              <td className="py-1.5">
                {g.label}
                {g.percentual && (
                  <span className="text-xs text-gray-500"> — {g.percent ?? 0}% sobre {brl(est.custoDireto)}</span>
                )}
              </td>
              <td className="py-1.5 print:hidden" />
              <td className="py-1.5 text-right">
                {g.percentual ? (
                  <span className="inline-flex items-center gap-1 justify-end">
                    <span className="print:hidden">
                      <ValorEditavel
                        valor={g.percent ?? 0}
                        sufixo="%"
                        disabled={isPending}
                        onSalvar={(v) => salvar("GESTAO", g.key, 0, v)}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </span>
                    <span>{brl(g.calculado)}</span>
                  </span>
                ) : (
                  <>
                    <span className="print:hidden">
                      <ValorEditavel
                        valor={g.amount}
                        disabled={isPending}
                        onSalvar={(v) => salvar("GESTAO", g.key, v)}
                        className={campo}
                      />
                    </span>
                    <span className="hidden print:inline">{brl(g.amount)}</span>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-base font-bold">
            <td className="pt-3">Total estimado</td>
            <td className="pt-3 print:hidden" />
            <td className="pt-3 text-right">{brl(est.total)}</td>
          </tr>
        </tfoot>
      </table>

      {est.semEstimativa > 0 && (
        <p className="mt-2 text-xs text-amber-700 print:hidden">
          {est.semEstimativa} {est.semEstimativa === 1 ? "serviço ainda sem valor" : "serviços ainda sem valor"} —
          o total está incompleto. A coluna Material é o custo calculado, sem mão de obra nem margem.
        </p>
      )}
    </section>
  );
}

// Salva ao sair do campo ou no Enter. Só grava se o número mudou, para não
// disparar uma gravação a cada passagem pelo campo.
function ValorEditavel({
  valor, onSalvar, disabled, className, sufixo,
}: {
  valor: number;
  onSalvar: (v: number) => void;
  disabled: boolean;
  className: string;
  sufixo?: string;
}) {
  const [txt, setTxt] = useState(valor ? String(valor).replace(".", ",") : "");

  function confirmar() {
    const n = Number(txt.replace(/\./g, "").replace(",", ".")) || 0;
    if (n !== valor) onSalvar(n);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        inputMode="decimal"
        placeholder="0,00"
        disabled={disabled}
        className={className}
      />
      {sufixo && <span className="text-sm text-gray-500">{sufixo}</span>}
    </span>
  );
}
