// Base da pintura, escolhida por projeto. O motor e os serviços de reforma
// geram "Selador acrílico" em litros; com fundo preparador, o mesmo consumo
// (0,10 L/m²) vira baldes de 20 L do catálogo.

export const PAINT_PRIMERS = [
  { value: "SELADOR", label: "Selador acrílico" },
  { value: "FUNDO_PREPARADOR", label: "Fundo preparador de parede" },
] as const;

export const SELADOR = "Selador acrílico";
export const FUNDO_PREPARADOR = "Fundo preparador de parede 20L";
const BALDE_L = 20;

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
    m.name === SELADOR ? { ...m, name: FUNDO_PREPARADOR, unit: "un", quantity: m.quantity / BALDE_L } : m
  );
}

export function baldesDeFundo(litros: number) {
  return Math.ceil(litros / BALDE_L);
}
