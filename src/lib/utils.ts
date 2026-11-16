import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Número digitado em pt-BR, tolerante: "2,42", "2.42", "1.234,56", "1.000" e
 * "1234.5" dão o valor certo. Com vírgula, ela é a decimal e os pontos são
 * milhar. Sem vírgula, ponto seguido de exatamente três dígitos é milhar
 * ("1.000" = mil, "1.250.000") e o resto é decimal ("2.42"). Tirar todos os
 * pontos sempre (como era antes) transformava "2.42" em 242.
 */
export function parseNumeroBR(texto: string): number {
  const t = texto.trim().replace(/\s/g, "");
  if (t === "") return NaN;
  if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
  return Number(t);
}
