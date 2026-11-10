// Revenda de material: preço de venda e lucro sobre o custo.
//
// O lucro é sobre o custo (markup): custo R$ 40 com 25% → revenda R$ 50. Só
// um dos dois fica gravado no material, e ele diz qual manda:
//   markupPercent — a revenda acompanha o custo quando o preço de compra muda;
//   resalePrice   — preço fixo; a porcentagem é recalculada a partir dele.

export type Revenda = {
  preco: number | null;
  lucroPct: number | null;
  segue: "lucro" | "preco" | null;
};

export function revendaDe(custo: number, resalePrice: number | null | undefined, markupPercent: number | null | undefined): Revenda {
  if (markupPercent != null && Number.isFinite(markupPercent)) {
    return { preco: arred(custo * (1 + markupPercent / 100)), lucroPct: markupPercent, segue: "lucro" };
  }
  if (resalePrice != null && Number.isFinite(resalePrice)) {
    return { preco: resalePrice, lucroPct: custo > 0 ? arred(((resalePrice - custo) / custo) * 100) : null, segue: "preco" };
  }
  return { preco: null, lucroPct: null, segue: null };
}

/** Lucro (%) que um preço de revenda dá sobre o custo. */
export function lucroDoPreco(custo: number, preco: number): number | null {
  return custo > 0 ? arred(((preco - custo) / custo) * 100) : null;
}

/** Preço de revenda que um lucro (%) dá sobre o custo. */
export function precoDoLucro(custo: number, lucroPct: number): number {
  return arred(custo * (1 + lucroPct / 100));
}

function arred(n: number) {
  return Math.round(n * 100) / 100;
}
