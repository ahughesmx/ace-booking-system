import { format } from 'date-fns';

// México no usa horario de verano, zona horaria fija UTC-6
const MEXICO_OFFSET_HOURS = -6;

/**
 * Get current time in Mexico City timezone (UTC-6) as a Date object
 */
export function getCurrentMexicoCityTime(): Date {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (3600000 * MEXICO_OFFSET_HOURS));
}

/**
 * Get current time in Mexico City timezone as ISO string
 */
export function getCurrentMexicoCityTimeISO(): string {
  return getCurrentMexicoCityTime().toISOString();
}

/**
 * Convert a UTC date to Mexico City timezone (UTC-6)
 */
export function toMexicoCityTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const utcTime = dateObj.getTime();
  return new Date(utcTime + (3600000 * MEXICO_OFFSET_HOURS));
}

/**
 * Convert a Mexico City time to UTC for database storage
 */
export function fromMexicoCityTimeToUTC(date: Date): Date {
  const mexicoCityTime = date.getTime();
  return new Date(mexicoCityTime - (3600000 * MEXICO_OFFSET_HOURS));
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
  return fromMexicoCityTimeToUTC(mexicoCityTime).toISOString();
}

/**
 * Get the end of today in Mexico City timezone as ISO string
 */
export function getEndOfTodayMexicoCityISO(): string {
  const mexicoCityTime = getCurrentMexicoCityTime();
  mexicoCityTime.setHours(23, 59, 59, 999);
  return fromMexicoCityTimeToUTC(mexicoCityTime).toISOString();
}

/**
 * Get the start of a specific date in Mexico City timezone as ISO string
 */
export function getStartOfDateMexicoCityISO(dateStr: string): string {
  // Parse the date string (YYYY-MM-DD) in Mexico City timezone (UTC-6)
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date in UTC then adjust to Mexico time
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  // Add 6 hours to get back to UTC (since Mexico is UTC-6, start of day in Mexico is 6 AM UTC)
  return new Date(utcDate.getTime() + (6 * 3600000)).toISOString();
}

/**
 * Get the end of a specific date in Mexico City timezone as ISO string
 */
export function getEndOfDateMexicoCityISO(dateStr: string): string {
  // Parse the date string (YYYY-MM-DD) in Mexico City timezone (UTC-6)
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date in UTC then adjust to Mexico time
  const utcDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  // Add 6 hours to get back to UTC (since Mexico is UTC-6)
  return new Date(utcDate.getTime() + (6 * 3600000)).toISOString();
}