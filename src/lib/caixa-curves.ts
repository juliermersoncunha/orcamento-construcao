// Curvas de evolução de obra da Caixa Econômica Federal
// Fonte: planilha_construcao_individual.xlsb — aba Proposta_Constr_Individual
// Percentuais ACUMULADOS por etapa de medição (mês)

export type CaixaCurves = {
  month: number;
  lenta: number;   // % acumulado curva lenta
  normal: number;  // % acumulado curva normal
  rapida: number;  // % acumulado curva rápida
};

// Curvas para obra de prazo padrão (6 meses/etapas)
// Dados extraídos diretamente da planilha Caixa
export const CAIXA_CURVES_6: CaixaCurves[] = [
  { month: 1, lenta:  5, normal:  8, rapida: 17 },
  { month: 2, lenta: 19, normal: 22, rapida: 33 },
  { month: 3, lenta: 28, normal: 39, rapida: 59 },
  { month: 4, lenta: 38, normal: 59, rapida: 84 },
  { month: 5, lenta: 50, normal: 74, rapida: 100 },
  { month: 6, lenta: 58, normal: 90, rapida: 100 },
];

// Curvas interpoladas para outros prazos (normaliza para N meses)
export function getCaixaCurves(totalMonths: number): CaixaCurves[] {
  if (totalMonths <= 0) return [];
  return Array.from({ length: totalMonths }, (_, i) => {
    const month = i + 1;
    // Interpola linearmente dos 6 pontos padrão
    const t = ((month - 1) / (totalMonths - 1)) * 5; // posição no array de 6 pontos
    const i0 = Math.min(Math.floor(t), 5);
    const i1 = Math.min(i0 + 1, 5);
    const frac = t - i0;

    const c0 = CAIXA_CURVES_6[i0];
    const c1 = CAIXA_CURVES_6[i1];
    return {
      month,
      lenta:  Math.round(c0.lenta  + frac * (c1.lenta  - c0.lenta)),
      normal: Math.round(c0.normal + frac * (c1.normal - c0.normal)),
      rapida: Math.round(c0.rapida + frac * (c1.rapida - c0.rapida)),
    };
  });
}
