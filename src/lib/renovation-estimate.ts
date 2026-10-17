// Estimativa de preço da reforma.
//
// O sistema sabe o custo do material; o preço de venda de cada ofício é o
// usuário que define, revisando a sugestão. Por isso cada linha tem o material
// calculado (referência) e o valor estimado (o que vale, e o que vai para o
// relatório do cliente).
//
// BDI é percentual sobre o custo direto — serviços mais mobilização, logística
// e gestão —, como manda a praxe de orçamento. Os demais itens de gestão são
// valores fechados.

import { MANAGEMENT_ITEMS, SERVICE_CATEGORIES, SERVICE_BY_KEY } from "./renovation-services";

export type CostLine = { kind: string; key: string; amount: number; percent: number | null };

export type LinhaServico = {
  categoria: string;
  servicos: string[];
  material: number;   // custo do material gerado, calculado
  estimado: number;   // valor definido pelo usuário
};

export type LinhaGestao = {
  key: string;
  label: string;
  percentual: boolean;
  amount: number;
  percent: number | null;
  calculado: number;  // o que esta linha soma ao total
};

export type Estimativa = {
  servicos: LinhaServico[];
  gestao: LinhaGestao[];
  totalServicos: number;
  custoDireto: number;   // serviços + gestão sem BDI — base do BDI
  totalGestao: number;
  total: number;
  materialTotal: number;
  semEstimativa: number; // ofícios ainda sem valor definido
};

export function montarEstimativa(
  servicos: { serviceKey: string }[],
  materialPorCategoria: Map<string, number>,
  linhas: CostLine[]
): Estimativa {
  const valorDe = (kind: string, key: string) =>
    linhas.find((l) => l.kind === kind && l.key === key) ?? null;

  // Só entram os ofícios que o projeto realmente tem.
  const usadas = new Map<string, string[]>();
  for (const s of servicos) {
    const def = SERVICE_BY_KEY.get(s.serviceKey);
    if (!def) continue;
    const l = usadas.get(def.categoria) ?? [];
    if (!l.includes(def.label)) l.push(def.label);
    usadas.set(def.categoria, l);
  }

  const linhasServico: LinhaServico[] = SERVICE_CATEGORIES
    .filter((c) => usadas.has(c))
    .map((categoria) => ({
      categoria,
      servicos: usadas.get(categoria) ?? [],
      material: Math.round((materialPorCategoria.get(categoria) ?? 0) * 100) / 100,
      estimado: valorDe("SERVICO", categoria)?.amount ?? 0,
    }));

  const totalServicos = linhasServico.reduce((s, l) => s + l.estimado, 0);
  const fixos = MANAGEMENT_ITEMS.filter((i) => !i.percentual);
  const totalFixos = fixos.reduce((s, i) => s + (valorDe("GESTAO", i.key)?.amount ?? 0), 0);
  const custoDireto = totalServicos + totalFixos;

  const gestao: LinhaGestao[] = MANAGEMENT_ITEMS.map((i) => {
    const l = valorDe("GESTAO", i.key);
    const percent = i.percentual ? l?.percent ?? 0 : null;
    const amount = l?.amount ?? 0;
    return {
      key: i.key,
      label: i.label,
      percentual: i.percentual,
      amount,
      percent,
      calculado: i.percentual ? Math.round(custoDireto * (percent ?? 0)) / 100 : amount,
    };
  });

  const totalGestao = gestao.reduce((s, g) => s + g.calculado, 0);
  return {
    servicos: linhasServico,
    gestao,
    totalServicos,
    custoDireto,
    totalGestao,
    total: totalServicos + totalGestao,
    materialTotal: linhasServico.reduce((s, l) => s + l.material, 0),
    semEstimativa: linhasServico.filter((l) => l.estimado === 0).length,
  };
}
