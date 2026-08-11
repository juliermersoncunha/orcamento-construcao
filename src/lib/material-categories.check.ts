// Trava de compilação: garante que MATERIAL_CATEGORIES cobre exatamente o enum
// MaterialCategory do Prisma — nem faltando, nem sobrando. Se alguém adicionar
// uma categoria no schema.prisma e esquecer de adicioná-la em
// material-categories.ts (ou vice-versa), `npx tsc` falha aqui.
//
// Arquivo só de tipos: não gera código nem é importado em runtime.

import type { MaterialCategory } from "@prisma/client";
import type { MaterialCategoryValue } from "./material-categories";

// Erro de compilação se A e B não forem o mesmo conjunto.
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

// Se isto falhar, compare a lista em material-categories.ts com o enum
// MaterialCategory em prisma/schema.prisma.
const _categoriesMatchPrismaEnum: AssertEqual<MaterialCategoryValue, MaterialCategory> = true;

export type { };
void _categoriesMatchPrismaEnum;
