// Quais materiais o motor de cálculo é capaz de emitir.
//
// A lista é DERIVADA: roda o próprio `calculateMaterials` com entradas
// sintéticas que ligam todos os ramos (tipo de fundação, de bloco, de telha, de
// acabamento de parede…) e junta os nomes que saírem. Nada é escrito à mão.
//
// Isso é de propósito. A lista anterior desse tipo — `ENGINE_GENERATED_NAMES`,
// em manual-catalog.ts — era mantida à mão e saiu de sincronia assim que o
// cálculo mudou, escondendo materiais da única tela onde podiam ser lançados.
// Derivando, a tela acompanha o motor sem ninguém lembrar de atualizar.
//
// O muro não passa por `calculateMaterials` (é montado na server action do
// orçamento, a partir das paredes da Etapa 7), então entra à parte.

import { calculateMaterials } from "@/lib/calculations";
import type { CalculationInput, RoomInput, StructureInput, RoofingInput } from "@/lib/calculations";

const AMBIENTE: RoomInput = {
  name: "sintético",
  width: 3,
  length: 4,
  height: 2.7,
  floorType: "ceramica",
  wallTile: true,
  wallTileHeight: 1.5,
  paintWalls: true,
  hydraulicWaterInlets: 1,
  hydraulicDrainPoints: 1,
  electricalOutlets: 2,
  electricalSwitches: 1,
  electricalLightPoints: 1,
};

const ESTRUTURA: StructureInput = {
  foundationType: "radier",
  structureType: "concreto",
  blockType: "ceramico",
  floors: 2,
  hasLaje: true,
  hasEscada: true,
  pilarMetros: 30, pilarLargura: 0.12, pilarAltura: 0.15,
  vigaMetros: 50, vigaLargura: 0.11, vigaAltura: 0.15,
  sapataQtd: 4, sapataLargura: 0.8, sapataCompr: 0.8, sapataAltura: 0.3,
  escavacaoM3: 10,
  compactacaoM2: 70,
  perimetroParedesExt: 34,
  perimetroParedesInt: 17,
  peDireito: 2.7,
  hasPlatibanda: true,
  platibandaML: 34,
  platibandaAltura: 0.75,
  lajeType: "forro",
  formasM2: 20,
  radierEspessura: 0.08,
  radierArea: 70,
};

const COBERTURA: RoofingInput = {
  roofType: "duas_aguas",
  tileType: "fibrocimento",
  inclination: 10,
  hasRoof: true,
  tileSize: "2,44 x 1,1",
  caibroM: 50, ripaM: 100, linhaM: 30, barroteM: 40,
};

// Cada combinação cobre um ramo que produz nome diferente.
function variantes(): CalculationInput[] {
  const base: CalculationInput = {
    rooms: [AMBIENTE, { ...AMBIENTE, floorType: "porcelanato", wallTile: false }],
    structure: ESTRUTURA,
    roofing: COBERTURA,
    finishes: { doors: 3, windows: 5, externalDoors: 2, wallFinishType: "SO_TINTA" },
    heatingType: "eletrico",
  };

  const saidas: CalculationInput[] = [base];

  // Fundação: radier e sapata emitem conjuntos distintos.
  saidas.push({ ...base, structure: { ...ESTRUTURA, foundationType: "sapata" } });

  // Bloco: cerâmico, concreto e celular são três nomes.
  for (const blockType of ["bloco_concreto", "bloco_celular"]) {
    saidas.push({ ...base, structure: { ...ESTRUTURA, blockType } });
  }

  // Telha: fibrocimento (dois tamanhos), cerâmica, metálica — e a laje
  // impermeabilizada, que troca telha por impermeabilizante.
  for (const r of [
    { tileType: "fibrocimento", tileSize: "1,83 x 1,1" },
    { tileType: "ceramica", tileSize: null },
    { tileType: "metalica", tileSize: null },
  ]) {
    saidas.push({ ...base, roofing: { ...COBERTURA, ...r } });
  }
  saidas.push({ ...base, roofing: { ...COBERTURA, roofType: "laje_impermeabilizada" } });

  // Acabamento de parede: massa corrida e gesso liso só aparecem nos seus ramos.
  for (const wallFinishType of ["MASSA_TINTA", "GESSO_TINTA"] as const) {
    saidas.push({ ...base, finishes: { ...base.finishes, wallFinishType } });
  }

  return saidas;
}

// Materiais do muro frontal — montados na server action do orçamento a partir
// das paredes da Etapa 7, fora de `calculateMaterials`.
const MATERIAIS_DO_MURO = [
  "Tijolo Cerâmico Furado 9x19x19",
  "Cimento CP-II (50kg)",
  "Areia Grossa",
];

let cache: Set<string> | null = null;

/** Nomes que o motor pode emitir hoje. Calculado uma vez por processo. */
export function engineMaterialNames(): Set<string> {
  if (cache) return cache;
  const nomes = new Set<string>(MATERIAIS_DO_MURO);
  for (const entrada of variantes()) {
    for (const m of calculateMaterials(entrada)) nomes.add(m.name);
  }
  cache = nomes;
  return nomes;
}

/**
 * O material entra no cálculo automático?
 *
 * Considera o apelido: um material cadastrado como "Janela (alumínio) 1x1,2m"
 * com `calcName` "Janela (alumínio)" é o que o motor vai usar, então ele faz
 * parte da matriz tanto quanto o nome genérico.
 */
export function isEngineMaterial(name: string, calcName?: string | null): boolean {
  const nomes = engineMaterialNames();
  return nomes.has(name) || (calcName ? nomes.has(calcName) : false);
}
