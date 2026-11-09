// Paradas da obra: períodos em que nada anda (o pedreiro saiu para outro
// serviço, falta de material, chuva longa).
//
// A programação da obra é semanal, então a parada também é contada em semanas
// inteiras: ela ocupa as semanas de calendário que toca, e é esse número que
// empurra as semanas marcadas dali em diante. Trabalhar em dias quebrados
// deixaria a grade de semanas fora de sincronia com as marcas.

import { diasUteisEntre, segundaISO, somarDias } from "./schedule-weeks";

export type Pausa = {
  id: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  reason: string | null;
  weeksShifted: number;
};

/** Segundas-feiras das semanas que a parada ocupa. */
export function semanasDaPausa(inicio: string, fim: string): string[] {
  if (fim < inicio) return [];
  const out: string[] = [];
  let seg = segundaISO(inicio);
  const ultima = segundaISO(fim);
  while (seg <= ultima && out.length < 260) {
    out.push(seg);
    seg = somarDias(seg, 7);
  }
  return out;
}

/** Todas as semanas paradas do projeto, para marcar na grade. */
export function semanasPausadas(pausas: Pausa[]): Map<string, Pausa> {
  const m = new Map<string, Pausa>();
  for (const p of pausas) {
    for (const s of semanasDaPausa(p.startDate, p.endDate)) m.set(s, p);
  }
  return m;
}

/** Dias úteis perdidos na parada, contando as duas pontas. */
export function diasUteisDaPausa(inicio: string, fim: string): number {
  if (fim < inicio) return 0;
  return diasUteisEntre(inicio, fim) + 1;
}

export function periodoBR(inicio: string, fim: string): string {
  const br = (d: string) => d.split("-").reverse().join("/");
  return `${br(inicio)} a ${br(fim)}`;
}
