import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Formatea una fecha y capitaliza la primera letra de cada palabra importante
 */
export function formatWithCapitalization(date: Date | string, formatString: string): string {
  const formattedDate = format(new Date(date), formatString, { locale: es });
  // Capitalizar la primera letra y después de cada "de "
  return formattedDate.replace(/^(\w)/, (match) => match.toUpperCase())
                    .replace(/(\sde\s)(\w)/g, (match, de, letter) => de + letter.toUpperCase());
}

/**
 * Formatea una fecha con el formato completo en español (Lunes, 1 de Enero)
 */
export function formatFullDate(date: Date | string): string {
  return formatWithCapitalization(date, "EEEE, d 'de' MMMM");
}

/**
 * Formatea una fecha con formato corto (Lunes 1 de Enero)
 */
export function formatShortDate(date: Date | string): string {
  return formatWithCapitalization(date, "EEEE d 'de' MMMM");
}