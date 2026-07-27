// Registry — resolve qualquer FixtureType/AccessoryType para a spec certa,
// independente do ambiente onde ela nasceu (banheiro ou cozinha).
//
// O motor `resolveRoomFixtures` consulta o registry por tipo e não precisa
// saber de qual biblioteca a spec veio. Novos ambientes (área de serviço,
// varanda) só precisam registrar seu módulo aqui.

import type { FixtureSpec, AccessorySpec } from "./types";
import {
  BATHROOM_FIXTURES,
  BATHROOM_ACCESSORY_SPECS,
  BATHROOM_DOOR_DEPENDENCIES,
  BATHROOM_WINDOW_DEPENDENCIES,
} from "./bathroom";
import {
  KITCHEN_FIXTURES,
  KITCHEN_ACCESSORY_SPECS,
} from "./kitchen";

// Concat simples. Nomes de fixtureType são únicos (mapeiam para o enum Prisma).
export const ALL_FIXTURES: FixtureSpec[] = [
  ...BATHROOM_FIXTURES,
  ...KITCHEN_FIXTURES,
];

export const ALL_ACCESSORIES: AccessorySpec[] = [
  ...BATHROOM_ACCESSORY_SPECS,
  ...KITCHEN_ACCESSORY_SPECS,
];

export function getFixtureSpec(fixtureType: string): FixtureSpec | undefined {
  return ALL_FIXTURES.find((f) => f.fixtureType === fixtureType);
}

export function getAccessorySpec(type: string): AccessorySpec | undefined {
  return ALL_ACCESSORIES.find((a) => a.type === type);
}

// Esquadrias com composição própria (banheiro tem porta/janela detalhadas). A
// cozinha usa esquadria genérica do calcAcabamento — se um dia tiver, é só
// adicionar aqui.
export function getJoineryDependencies(subtype: string, isWindow: boolean) {
  if (subtype === "banheiro") {
    return isWindow ? BATHROOM_WINDOW_DEPENDENCIES : BATHROOM_DOOR_DEPENDENCIES;
  }
  return null;
}

// Lista de materiais do fixture que o usuário pode marcar como "já incluído no
// produto comprado", filtrando pelas cláusulas `onlyIf`. Genérica: funciona
// para banheiro e cozinha.
export function includableComponents(
  fixtureType: string,
  config: Record<string, unknown>
): string[] {
  const spec = getFixtureSpec(fixtureType);
  if (!spec) return [];
  const out: string[] = [];
  for (const dep of spec.dependencies) {
    if (!dep.canBeIncluded) continue;
    if (dep.onlyIf && !dep.onlyIf(config)) continue;
    const name = typeof dep.material === "function" ? dep.material(config) : dep.material;
    if (!out.includes(name)) out.push(name);
  }
  return out;
}
