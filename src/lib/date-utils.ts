import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Formatea una fecha y capitaliza la primera letra
 */
export function formatWithCapitalization(date: Date | string, formatString: string): string {
  const formattedDate = format(new Date(date), formatString, { locale: es });
  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

/**
 * Formatea una fecha con el formato completo en español (Lunes, 1 de enero)
 */
export function formatFullDate(date: Date | string): string {
  return formatWithCapitalization(date, "EEEE, d 'de' MMMM");
}

/**
 * Formatea una fecha con formato corto (Lunes 1 de enero)
 */
export function formatShortDate(date: Date | string): string {
  return formatWithCapitalization(date, "EEEE d 'de' MMMM");
}