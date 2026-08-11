// Classificação de ambiente usada pelo motor de cálculo e pelas telas.
//
// A regra estava duplicada em três telas do wizard, cada uma com sua própria
// lista de palavras. Agora vive aqui — quem precisar saber se um cômodo é
// banheiro chama isBathroomRoom.
//
// Ambientes cadastrados antes do campo roomType existir têm roomType nulo;
// nesses casos caímos no nome, que é como o usuário sempre os identificou.

import { BATHROOM_ROOM_TYPE_SET } from "./fixture-library/bathroom";
import { KITCHEN_ROOM_TYPE_SET } from "./fixture-library/kitchen";

export function isBathroomRoom(
  roomType: string | null | undefined,
  name: string | null | undefined
): boolean {
  if (roomType) return BATHROOM_ROOM_TYPE_SET.has(roomType);
  const n = (name ?? "").toLowerCase();
  return n.includes("banheiro") || n.includes("lavabo") || n.includes("wc");
}

export function isKitchenRoom(
  roomType: string | null | undefined,
  name: string | null | undefined
): boolean {
  if (roomType) return KITCHEN_ROOM_TYPE_SET.has(roomType);
  const n = (name ?? "").toLowerCase();
  return n.includes("cozinha") || n.includes("copa");
}

// Argamassa de assentamento do azulejo de parede.
//
// Banheiro é área molhada: leva AC-III, de maior aderência e resistência à
// umidade. Demais ambientes (cozinha, área de serviço) levam AC-I, suficiente
// para parede interna de baixa solicitação.
export const ARGAMASSA_PAREDE_BANHEIRO = "Argamassa AC-III";
export const ARGAMASSA_PAREDE_GERAL = "Argamassa AC-I (assentamento azulejo)";

export function argamassaParede(
  roomType: string | null | undefined,
  name: string | null | undefined
): string {
  return isBathroomRoom(roomType, name)
    ? ARGAMASSA_PAREDE_BANHEIRO
    : ARGAMASSA_PAREDE_GERAL;
}
