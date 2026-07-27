// Resolve as escolhas globais do projeto (ProjectInstallations.outletType,
// switchType, lightPointType) nos materiais concretos do catálogo. Usado por
// per-room.ts (memorial por ambiente) e calcEletrica (consolidado global) —
// mantém os dois cálculos com nomes idênticos.

export type OutletType = "SIMPLES" | "DUPLA" | "TRIPLA";
export type SwitchType = "SIMPLES" | "DUPLO" | "TRIPLO";
export type LightPointType = "RECEPTACULO_LAMPADA" | "PLAFON_LED";

export type ElectricalFinishes = {
  outletType: OutletType;
  switchType: SwitchType;
  lightPointType: LightPointType;
};

export const ELECTRICAL_FINISH_DEFAULTS: ElectricalFinishes = {
  outletType: "SIMPLES",
  switchType: "SIMPLES",
  lightPointType: "PLAFON_LED",
};

export type MaterialSpec = { name: string; unit: string; qty: number };

// Um ponto de tomada (uma caixa 4x2 na parede) → 1 item do tipo escolhido.
export function outletMaterialsPerPoint(t: OutletType): MaterialSpec {
  switch (t) {
    case "DUPLA":  return { name: "Conjunto 2 tomadas 2P+T 10A", unit: "un", qty: 1 };
    case "TRIPLA": return { name: "Conjunto 3 tomadas 2P+T 10A", unit: "un", qty: 1 };
    default:       return { name: "Tomada 2P+T 10A", unit: "un", qty: 1 };
  }
}

export function switchMaterialsPerPoint(t: SwitchType): MaterialSpec {
  switch (t) {
    case "DUPLO":  return { name: "Interruptor duplo 10A", unit: "un", qty: 1 };
    case "TRIPLO": return { name: "Interruptor triplo 10A", unit: "un", qty: 1 };
    default:       return { name: "Interruptor simples 10A", unit: "un", qty: 1 };
  }
}

// Ponto de luz pode gerar 1 ou 2 materiais (o receptáculo + a lâmpada). Um
// array porque o memorial mostra as duas linhas separadas.
export function lightPointMaterialsPerPoint(t: LightPointType): MaterialSpec[] {
  if (t === "PLAFON_LED") {
    return [{ name: "Plafon LED 18W (integrado)", unit: "un", qty: 1 }];
  }
  return [
    { name: "Plafon plástico E-27", unit: "un", qty: 1 },
    { name: "Lâmpada LED bulbo 9W", unit: "un", qty: 1 },
  ];
}

// Rótulo humano para o memorial ("Tomada dupla" etc.)
export const OUTLET_LABEL: Record<OutletType, string> = {
  SIMPLES: "Tomada simples 2P+T 10A",
  DUPLA:   "Tomada dupla 2P+T 10A",
  TRIPLA:  "Tomada tripla 2P+T 10A",
};
export const SWITCH_LABEL: Record<SwitchType, string> = {
  SIMPLES: "Interruptor 1 tecla",
  DUPLO:   "Interruptor 2 teclas",
  TRIPLO:  "Interruptor 3 teclas",
};
export const LIGHT_POINT_LABEL: Record<LightPointType, string> = {
  RECEPTACULO_LAMPADA: "Receptáculo E-27 + lâmpada LED 9W",
  PLAFON_LED:          "Plafon LED 18W integrado",
};
