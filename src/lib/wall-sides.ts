// Lados de parede que a Etapa 6 controla. BOX e PIA ficam de fora de propósito:
// pertencem aos cards de banheiro/cozinha da Etapa 5, que os gravam na mesma
// tabela (RoomWallFinish). Separar os domínios evita que uma tela apague o que
// a outra configurou.

export const CARDINAL_WALL_SIDES = ["FRENTE", "FUNDO", "ESQUERDA", "DIREITA"] as const;

export type CardinalWallSide = (typeof CARDINAL_WALL_SIDES)[number];

export const CARDINAL_WALL_LABELS: Record<CardinalWallSide, string> = {
  FRENTE: "Frente",
  FUNDO: "Fundo",
  ESQUERDA: "Esquerda",
  DIREITA: "Direita",
};

// Comprimento padrão de cada lado, a partir das medidas do cômodo. Frente e
// fundo acompanham a largura; esquerda e direita, o comprimento.
export function defaultWallLength(
  side: CardinalWallSide,
  width: number,
  length: number
): number {
  return side === "FRENTE" || side === "FUNDO" ? width : length;
}
