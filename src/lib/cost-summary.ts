// Resumo de custos da obra: material + mão de obra por função + gestão.
//
// BDI é percentual sobre o custo direto — material, mão de obra e os itens
// fixos de gestão (mobilização, logística, gestão) —, como manda a praxe.

import { MANAGEMENT_ITEMS } from "./renovation-services";

export const ROLE_LABELS: Record<string, string> = {
  PEDREIRO: "Pedreiro",
  PINTOR: "Pintor",
  ELETRICISTA: "Eletricista",
  LIMPEZA: "Limpeza",
};

export type LinhaValor = { label: string; valor: number };
export type LinhaGestaoResumo = LinhaValor & { key: string; percent: number | null };

export type ResumoCustos = {
  materiais: number;
  maoDeObra: LinhaValor[];
  totalMO: number;
  gestao: LinhaGestaoResumo[];
  totalGestao: number;
  custoDireto: number;
  total: number;
};

export function calcularBdi(custoDireto: number, percent: number | null | undefined) {
  return percent ? (custoDireto * percent) / 100 : 0;
}

export function montarResumoCustos(
  materiais: number,
  laborLines: { role: string; label: string | null; value: number }[],
  gestaoLines: { key: string; amount: number; percent: number | null }[]
): ResumoCustos {
  const maoDeObra = laborLines
    .filter((l) => l.value > 0)
    .map((l) => ({ label: ROLE_LABELS[l.role] ?? l.label ?? "Outros", valor: l.value }));
  const totalMO = maoDeObra.reduce((s, l) => s + l.valor, 0);

  const linha = (key: string) => gestaoLines.find((g) => g.key === key);
  const fixos = MANAGEMENT_ITEMS.filter((i) => !i.percentual).map((i) => ({
    key: i.key, label: i.label, percent: null, valor: linha(i.key)?.amount ?? 0,
  }));
  const totalFixos = fixos.reduce((s, g) => s + g.valor, 0);
  const custoDireto = materiais + totalMO + totalFixos;

  const bdis = MANAGEMENT_ITEMS.filter((i) => i.percentual).map((i) => {
    const percent = linha(i.key)?.percent ?? null;
    return { key: i.key, label: i.label, percent, valor: calcularBdi(custoDireto, percent) };
  });

  const gestao = [...fixos, ...bdis];
  const totalGestao = gestao.reduce((s, g) => s + g.valor, 0);

  return { materiais, maoDeObra, totalMO, gestao, totalGestao, custoDireto, total: custoDireto + bdis.reduce((s, g) => s + g.valor, 0) };
}
