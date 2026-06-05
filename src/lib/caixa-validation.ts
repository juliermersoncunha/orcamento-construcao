// Faixas percentuais da Caixa Econômica Federal (PLS - Planilha de Levantamento de Serviços)
// Fonte: planilha_construcao_individual.xlsb — itens 1 a 20

export type CaixaItem = {
  item: number;
  label: string;
  min: number; // % mínimo sobre custo total
  max: number; // % máximo sobre custo total
  phases: string[]; // fases do sistema que compõem este item
};

export const CAIXA_ITEMS: CaixaItem[] = [
  {
    item: 1,
    label: "Serviços Preliminares (barracão, ligações prov.)",
    min: 1.13,
    max: 3.97,
    phases: ["TERRAPLENAGEM"],
  },
  {
    item: 2,
    label: "Infraestrutura (fundação)",
    min: 3.07,
    max: 7.43,
    phases: ["FUNDACAO"],
  },
  {
    item: 3,
    label: "Supraestrutura (vigas, pilares, laje, escada)",
    min: 12.17,
    max: 17.67,
    phases: ["ESTRUTURA_ALVENARIA", "LAJE", "ESCADA"],
  },
  {
    item: 4,
    label: "Paredes e Painéis",
    min: 4.8,
    max: 10.67,
    phases: [],
  },
  {
    item: 5,
    label: "Esquadrias e Acabamento",
    min: 4.16,
    max: 13.27,
    phases: ["ACABAMENTO"],
  },
  {
    item: 6,
    label: "Vidros e Plásticos",
    min: 0,
    max: 2.45,
    phases: [],
  },
  {
    item: 7,
    label: "Coberturas (estrutura e telhas)",
    min: 0,
    max: 12.94,
    phases: ["COBERTURA"],
  },
  {
    item: 8,
    label: "Impermeabilizações",
    min: 0,
    max: 10.1,
    phases: [],
  },
  {
    item: 9,
    label: "Revestimentos Internos",
    min: 6.81,
    max: 9.32,
    phases: ["REVESTIMENTOS"],
  },
  {
    item: 10,
    label: "Forros",
    min: 0,
    max: 2.18,
    phases: [],
  },
  {
    item: 11,
    label: "Revestimentos Externos",
    min: 3.87,
    max: 5.3,
    phases: [],
  },
  {
    item: 12,
    label: "Pinturas",
    min: 3.63,
    max: 6.47,
    phases: ["PINTURA"],
  },
  {
    item: 13,
    label: "Pisos",
    min: 8.41,
    max: 11.51,
    phases: [],
  },
  {
    item: 14,
    label: "Acabamentos (soleiras, rodapés, peitoris)",
    min: 1.01,
    max: 1.38,
    phases: [],
  },
  {
    item: 15,
    label: "Instalações Elétricas e Telefônicas",
    min: 3.75,
    max: 4.85,
    phases: ["INSTALACOES_ELETRICAS"],
  },
  {
    item: 16,
    label: "Instalações Hidráulicas",
    min: 3.63,
    max: 4.27,
    phases: [],
  },
  {
    item: 17,
    label: "Esgoto e Águas Pluviais",
    min: 3.65,
    max: 4.3,
    phases: ["INSTALACOES_HIDROSSANITARIAS"],
  },
  {
    item: 18,
    label: "Louças e Metais",
    min: 4.14,
    max: 4.87,
    phases: [],
  },
  {
    item: 19,
    label: "Complementos (limpeza, calafetação)",
    min: 0.24,
    max: 2.29,
    phases: ["OUTROS"],
  },
  {
    item: 20,
    label: "Outros serviços",
    min: 0,
    max: 10,
    phases: [],
  },
];

export type ValidationResult = {
  item: number;
  label: string;
  phases: string[];
  value: number;      // R$ do item
  percent: number;    // % sobre total
  min: number;
  max: number;
  status: "ok" | "low" | "high" | "zero" | "na";
};

export function validateBudgetAgainstCaixa(
  phaseTotals: Record<string, number>,
  grandTotal: number
): ValidationResult[] {
  if (grandTotal <= 0) return [];

  return CAIXA_ITEMS
    .map((caixaItem) => {
      if (caixaItem.phases.length === 0) return null;

      const value = caixaItem.phases.reduce(
        (sum, phase) => sum + (phaseTotals[phase] ?? 0),
        0
      );
      const percent = (value / grandTotal) * 100;

      let status: ValidationResult["status"];
      if (value === 0 && caixaItem.min === 0) {
        status = "na"; // opcional, não faz parte do projeto
      } else if (value === 0) {
        status = "zero";
      } else if (percent < caixaItem.min) {
        status = "low";
      } else if (percent > caixaItem.max) {
        status = "high";
      } else {
        status = "ok";
      }

      return {
        item: caixaItem.item,
        label: caixaItem.label,
        phases: caixaItem.phases,
        value,
        percent,
        min: caixaItem.min,
        max: caixaItem.max,
        status,
      } satisfies ValidationResult;
    })
    .filter(Boolean) as ValidationResult[];
}
