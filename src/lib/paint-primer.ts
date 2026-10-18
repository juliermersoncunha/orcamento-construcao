// Base da pintura, escolhida por projeto. O motor e os serviços de reforma
// geram "Selador acrílico" em litros (0,10 L/m²); com fundo preparador, a
// mesma área vira baldes de 20 L do catálogo.

export const PAINT_PRIMERS = [
  { value: "SELADOR", label: "Selador acrílico" },
  { value: "FUNDO_PREPARADOR", label: "Fundo preparador de parede" },
] as const;

export const SELADOR = "Selador acrílico";
export const FUNDO_PREPARADOR = "Fundo preparador de parede 20L";
const SELADOR_L_POR_M2 = 0.10;
// Rendimento informado pelo usuário: um balde de 20 L cobre 288 m², e a obra
// aplica uma demão só.
const FUNDO_M2_POR_BALDE = 288;

export function usaFundoPreparador(primer: string | null | undefined) {
  return primer === "FUNDO_PREPARADOR";
}

// Troca o selador (em litros) pelo fundo preparador (em baldes). Não arredonda:
// quem chama arredonda no total, para não contar um balde por parede.
export function aplicarFundo<T extends { name: string; unit: string; quantity: number }>(
  items: T[],
  primer: string | null | undefined
): T[] {
  if (!usaFundoPreparador(primer)) return items;
  return items.map((m) =>
    m.name === SELADOR
      ? { ...m, name: FUNDO_PREPARADOR, unit: "un", quantity: m.quantity / SELADOR_L_POR_M2 / FUNDO_M2_POR_BALDE }
      : m
  );
}

export function baldesDeFundo(areaM2: number) {
  return Math.ceil(areaM2 / FUNDO_M2_POR_BALDE);
}

export const FORMULA_FUNDO = `÷ ${FUNDO_M2_POR_BALDE} m² por balde (1 demão)`;
