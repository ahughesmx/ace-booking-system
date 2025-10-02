import { format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const MEXICO_CITY_TIMEZONE = 'America/Mexico_City';

/**
 * Get current time in Mexico City timezone as a Date object
 */
export function getCurrentMexicoCityTime(): Date {
  return toZonedTime(new Date(), MEXICO_CITY_TIMEZONE);
}

/**
 * Get current time in Mexico City timezone as ISO string
 */
export function getCurrentMexicoCityTimeISO(): string {
  const mexicoCityTime = getCurrentMexicoCityTime();
  return fromZonedTime(mexicoCityTime, MEXICO_CITY_TIMEZONE).toISOString();
}

/**
 * Convert a date to Mexico City timezone
 */
export function toMexicoCityTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, MEXICO_CITY_TIMEZONE);
}

/**
 * Convert a Mexico City time to UTC for database storage
 */
export function fromMexicoCityTimeToUTC(date: Date): Date {
  return fromZonedTime(date, MEXICO_CITY_TIMEZONE);
}

/**
 * Format a date in Mexico City timezone
 */
export function formatInMexicoCityTime(date: Date | string, formatStr: string): string {
  const mexicoCityTime = toMexicoCityTime(date);
  return format(mexicoCityTime, formatStr);
}

/**
 * Check if a date/time is in the past (Mexico City timezone)
 */
export function isInPastMexicoCityTime(date: Date | string): boolean {
  const dateToCheck = typeof date === 'string' ? new Date(date) : date;
  const currentMexicoCityTime = getCurrentMexicoCityTime();
  return dateToCheck < currentMexicoCityTime;
}

/**
 * Get the start of today in Mexico City timezone as ISO string
 */
export function getStartOfTodayMexicoCityISO(): string {
  const mexicoCityTime = getCurrentMexicoCityTime();
  mexicoCityTime.setHours(0, 0, 0, 0);
  return fromZonedTime(mexicoCityTime, MEXICO_CITY_TIMEZONE).toISOString();
}

/**
 * Get the end of today in Mexico City timezone as ISO string
 */
export function getEndOfTodayMexicoCityISO(): string {
  const mexicoCityTime = getCurrentMexicoCityTime();
  mexicoCityTime.setHours(23, 59, 59, 999);
  return fromZonedTime(mexicoCityTime, MEXICO_CITY_TIMEZONE).toISOString();
}

/**
 * Get the start of a specific date in Mexico City timezone as ISO string
 */
export function getStartOfDateMexicoCityISO(dateStr: string): string {
  // Parse the date string (YYYY-MM-DD) in Mexico City timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  const mexicoCityDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  return fromZonedTime(mexicoCityDate, MEXICO_CITY_TIMEZONE).toISOString();
}

/**
 * Get the end of a specific date in Mexico City timezone as ISO string
 */
export function getEndOfDateMexicoCityISO(dateStr: string): string {
  // Parse the date string (YYYY-MM-DD) in Mexico City timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  const mexicoCityDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  return fromZonedTime(mexicoCityDate, MEXICO_CITY_TIMEZONE).toISOString();
}