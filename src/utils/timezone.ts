import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

// Use America/Mexico_City timezone for all conversions
const TZ = 'America/Mexico_City';

/**
 * Get current time in Mexico City timezone as a Date object
 * Uses date-fns-tz for reliable timezone conversion
 */
export function getCurrentMexicoCityTime(): Date {
  return toZonedTime(new Date(), TZ);
}

/**
 * Get current time in Mexico City timezone as ISO string
 */
export function getCurrentMexicoCityTimeISO(): string {
  return getCurrentMexicoCityTime().toISOString();
}

/**
 * Convert a UTC date to Mexico City timezone
 * Uses date-fns-tz for reliable timezone conversion
 */
export function toMexicoCityTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, TZ);
}

/**
 * Convert a Mexico City time to UTC for database storage
 * Uses date-fns-tz for reliable timezone conversion
 */
export function fromMexicoCityTimeToUTC(date: Date): Date {
  return fromZonedTime(date, TZ);
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

/**
 * Get date key in Mexico City timezone (format: yyyy-MM-dd)
 * Used for comparing if two dates are the same day in CDMX
 * Uses date-fns-tz for reliable timezone conversion
 */
export function mexicoDayKey(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const mexicoDate = toZonedTime(dateObj, TZ);
  const year = mexicoDate.getFullYear();
  const month = String(mexicoDate.getMonth() + 1).padStart(2, '0');
  const day = String(mexicoDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in Mexico City as UTC timestamp (milliseconds)
 */
export function getMexicoNowUTC(): number {
  const nowMexico = getCurrentMexicoCityTime();
  return fromMexicoCityTimeToUTC(nowMexico).getTime();
}

/**
 * Get slot start and end bounds as UTC timestamps for a given date and hour in Mexico City
 * Uses date-fns-tz to handle timezone conversion reliably
 * @param dateMexico - Date in Mexico City timezone
 * @param hour - Hour of the day (0-23)
 * @returns Object with startUTC and endUTC as timestamps
 */
export function getSlotBoundsUTC(dateMexico: Date, hour: number): { startUTC: number; endUTC: number } {
  // Create a date in CDMX with the specified hour
  const mexicoDate = toZonedTime(dateMexico, TZ);
  mexicoDate.setHours(hour, 0, 0, 0);
  
  // Convert to UTC using date-fns-tz
  const startUTC = fromZonedTime(mexicoDate, TZ).getTime();
  
  // End is 1 hour later
  mexicoDate.setHours(hour + 1, 0, 0, 0);
  const endUTC = fromZonedTime(mexicoDate, TZ).getTime();
  
  return { startUTC, endUTC };
}

/**
 * Check if a time slot is in the past (Mexico City timezone)
 * A slot is past if it's the same day in CDMX and current time >= slot end time
 * @param dateMexico - Date in Mexico City timezone
 * @param hour - Hour of the day (0-23)
 */
export function isSlotPastMexico(dateMexico: Date, hour: number): boolean {
  const nowMexico = getCurrentMexicoCityTime();
  const nowUTC = fromMexicoCityTimeToUTC(nowMexico).getTime();
  
  // Check if same day in CDMX
  const isSameDay = mexicoDayKey(dateMexico) === mexicoDayKey(nowMexico);
  
  if (!isSameDay) {
    // If different day, check if dateMexico is before today
    return mexicoDayKey(dateMexico) < mexicoDayKey(nowMexico);
  }
  
  // Same day: slot is past if current time >= end of slot
  const { endUTC } = getSlotBoundsUTC(dateMexico, hour);
  return nowUTC >= endUTC;
}

/**
 * Check if two dates are the same day in Mexico City timezone
 * Uses date-fns-tz for reliable comparison
 */
export function isSameMexicoDay(dateA: Date | string, dateB: Date | string): boolean {
  return mexicoDayKey(dateA) === mexicoDayKey(dateB);
}