"use client";

// Preço de revenda e lucro (%) ligados: o usuário digita um, o outro aparece
// calculado sobre o custo. O que foi digitado por último é o que fica gravado
// (ver lib/resale.ts) — por isso o estado guarda qual campo manda.

import { lucroDoPreco, precoDoLucro } from "@/lib/resale";

export type ModoRevenda = "preco" | "lucro" | null;
export type EstadoRevenda = { modo: ModoRevenda; valor: string };

const num = (v: string) => Number(v.replace(",", "."));
const brl = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Estado inicial a partir do que está gravado no material. */
export function estadoInicial(resalePrice: number | null | undefined, markupPercent: number | null | undefined): EstadoRevenda {
  if (markupPercent != null) return { modo: "lucro", valor: String(markupPercent).replace(".", ",") };
  if (resalePrice != null) return { modo: "preco", valor: String(resalePrice).replace(".", ",") };
  return { modo: null, valor: "" };
}

/** O que vai para o servidor: só o campo que manda. */
export function paraSalvar(e: EstadoRevenda): { resalePrice: number | null; markupPercent: number | null } {
  const v = num(e.valor);
  if (e.modo === "preco" && e.valor.trim() !== "" && Number.isFinite(v)) return { resalePrice: v, markupPercent: null };
  if (e.modo === "lucro" && e.valor.trim() !== "" && Number.isFinite(v)) return { resalePrice: null, markupPercent: v };
  return { resalePrice: null, markupPercent: null };
}

export function CamposRevenda({
  custo, estado, onChange, compacto = false,
}: {
  custo: number;
  estado: EstadoRevenda;
  onChange: (e: EstadoRevenda) => void;
  compacto?: boolean;
}) {
  const v = num(estado.valor);
  const valido = estado.valor.trim() !== "" && Number.isFinite(v);
  const precoMostrado =
    estado.modo === "preco" ? estado.valor
    : estado.modo === "lucro" && valido ? brl(precoDoLucro(custo, v))
    : "";
  const lucroCalc = estado.modo === "preco" && valido ? lucroDoPreco(custo, v) : null;
  const lucroMostrado =
    estado.modo === "lucro" ? estado.valor
    : lucroCalc !== null ? String(lucroCalc).replace(".", ",")
    : "";

  const mudar = (modo: ModoRevenda, valor: string) => onChange({ modo: valor.trim() === "" ? null : modo, valor });

  const campo = compacto
    ? "w-20 rounded border border-brand-400 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
    : "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
  // O campo que está sendo calculado fica mais apagado, para ficar claro qual manda.
  const calculado = "bg-surface text-ink-3";

  const prejuizo = valido && ((estado.modo === "lucro" && v < 0) || (lucroCalc !== null && lucroCalc < 0));

  if (compacto) {
    return (
      <div className="flex flex-col items-end gap-1">
        <label className="flex items-center gap-1 text-[11px] text-gray-500">
          R$
          <input
            value={precoMostrado}
            onChange={(e) => mudar("preco", e.target.value)}
            inputMode="decimal"
            placeholder="revenda"
            className={`${campo} ${estado.modo === "lucro" ? calculado : ""}`}
          />
        </label>
        <label className="flex items-center gap-1 text-[11px] text-gray-500">
          %
          <input
            value={lucroMostrado}
            onChange={(e) => mudar("lucro", e.target.value)}
            inputMode="decimal"
            placeholder="lucro"
            className={`${campo} ${estado.modo === "preco" ? calculado : ""}`}
          />
        </label>
        {prejuizo && <p className="text-[11px] text-red-600">abaixo do custo</p>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-ink-2">
        Preço de revenda (R$)
        <input
          value={precoMostrado}
          onChange={(e) => mudar("preco", e.target.value)}
          inputMode="decimal"
          placeholder="opcional"
          className={`${campo} ${estado.modo === "lucro" ? calculado : ""}`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink-2">
        Lucro sobre o custo (%)
        <input
          value={lucroMostrado}
          onChange={(e) => mudar("lucro", e.target.value)}
          inputMode="decimal"
          placeholder="opcional"
          className={`${campo} ${estado.modo === "preco" ? calculado : ""}`}
        />
      </label>
      <p className="col-span-2 self-end text-xs text-ink-3">
        {estado.modo === "lucro"
          ? "A revenda acompanha o custo: se o preço de compra mudar, ela é recalculada com esse lucro."
          : estado.modo === "preco"
            ? "Preço fixo: se o custo mudar, a revenda continua igual e o lucro é recalculado."
            : "Preencha um dos dois; o outro é calculado sobre o preço por unidade."}
        {prejuizo && <span className="block text-red-600">Revenda abaixo do custo.</span>}
      </p>
    </div>
  );
}
