import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Fuso horário oficial do HUB — sempre Brasília, independente do relógio do computador. */
export const BR_TIMEZONE = "America/Sao_Paulo";

/** Formata a hora (HH:mm) no fuso de Brasília. */
export function formatBrTime(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: BR_TIMEZONE });
}

/** Formata a data (dd/mm/aaaa) no fuso de Brasília. */
export function formatBrDate(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { timeZone: BR_TIMEZONE });
}
