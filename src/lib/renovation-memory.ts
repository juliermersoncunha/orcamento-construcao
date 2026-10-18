// Memória de cálculo da reforma: de que serviço, em que ambiente e com que
// coeficiente sai cada material. As regras de materiais são lineares na
// medida do serviço, então o coeficiente é quantidade ÷ medida.

import { SERVICE_BY_KEY } from "./renovation-services";
import { aplicarFundo } from "./paint-primer";

export type LinhaMemoria = {
  serviceKey: string;
  servico: string;
  ambiente: string;
  medida: number;
  unidadeServico: string;
  material: string;
  unit: string;
  phase: string;
  quantidade: number;
  coef: number;
};

type Servico = { serviceKey: string; label: string | null; quantity: number; roomId: string | null };
type Ambiente = { id: string; nome: string };

const GERAL = "Geral / área externa";

function fmt(n: number, casas = 2) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

export function formatarCoef(coef: number, unit: string, unidadeServico: string) {
  // Item contado (balde, caçamba) com consumo baixo lê melhor como "1 a cada N m²".
  if (coef < 0.05 && unit.toLowerCase() === "un") return `1 ${unit} a cada ${fmt(1 / coef, 1)} ${unidadeServico}`;
  return `${fmt(coef, coef < 0.05 ? 4 : 3)} ${unit}/${unidadeServico}`;
}

export function memoriaServicos(servicos: Servico[], ambientes: Ambiente[], primer?: string | null): LinhaMemoria[] {
  const linhas: LinhaMemoria[] = [];
  for (const s of servicos) {
    const def = SERVICE_BY_KEY.get(s.serviceKey);
    if (!def?.materiais || !(s.quantity > 0)) continue;
    const ambiente = ambientes.find((a) => a.id === s.roomId)?.nome.trim() ?? GERAL;
    for (const m of aplicarFundo(def.materiais(s.quantity), primer)) {
      linhas.push({
        serviceKey: s.serviceKey,
        servico: s.label || def.label,
        ambiente,
        medida: s.quantity,
        unidadeServico: def.unit,
        material: m.name,
        unit: m.unit,
        phase: m.phase,
        quantidade: m.quantity,
        coef: m.quantity / s.quantity,
      });
    }
  }
  return linhas;
}

// Mesmo arredondamento de materiaisDosServicos: só no total.
function arredondar(q: number, unit: string) {
  return unit === "m³" ? Math.ceil(q * 10) / 10 : Math.ceil(q);
}

export type Explicacao = { materialName: string; formula: string; result: string };

// Por fase e material: soma das medidas de cada tipo de serviço × coeficiente.
export function explicacoesPorFase(linhas: LinhaMemoria[]): Record<string, Explicacao[]> {
  const porFase: Record<string, Explicacao[]> = {};
  const materiais = new Map<string, LinhaMemoria[]>();
  for (const l of linhas) {
    const k = `${l.phase}|${l.material}`;
    materiais.set(k, [...(materiais.get(k) ?? []), l]);
  }
  for (const [k, ls] of materiais) {
    const [phase, material] = k.split("|");
    const porServico = new Map<string, { nome: string; medida: number; un: string; coef: number }>();
    for (const l of ls) {
      const a = porServico.get(l.serviceKey) ?? { nome: l.servico, medida: 0, un: l.unidadeServico, coef: l.coef };
      a.medida += l.medida;
      porServico.set(l.serviceKey, a);
    }
    const total = ls.reduce((s, l) => s + l.quantidade, 0);
    const unit = ls[0].unit;
    const formula = [...porServico.values()]
      .map((p) => `${p.nome}: ${fmt(p.medida)} ${p.un} × ${formatarCoef(p.coef, unit, p.un)}`)
      .join(" + ");
    (porFase[phase] ??= []).push({
      materialName: material,
      formula,
      result: `${fmt(total)} → ${fmt(arredondar(total, unit))} ${unit}`,
    });
  }
  return porFase;
}
