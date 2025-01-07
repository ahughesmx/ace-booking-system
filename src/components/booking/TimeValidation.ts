import { addHours, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { zonedTimeToUtc } from 'date-fns-tz/v2';

export function normalizeDateTime(date: Date, timeString: string): Date {
  // Parse the time string (format: "HH:00")
  const [hours] = timeString.split(':').map(Number);
  
  // Create a new date with the specified time
  let normalizedDate = setHours(date, hours);
  normalizedDate = setMinutes(normalizedDate, 0);
  normalizedDate = setSeconds(normalizedDate, 0);
  normalizedDate = setMilliseconds(normalizedDate, 0);
  
  // Convert to UTC considering Mexico City timezone
  const mexicoCityDate = zonedTimeToUtc(normalizedDate, 'America/Mexico_City');
  
  return mexicoCityDate;
}

export function validateTimeRange(startTime: Date): boolean {
  const mexicoCityTime = zonedTimeToUtc(startTime, 'America/Mexico_City');
  const hours = mexicoCityTime.getHours();
  
  // Business hours: 8 AM to 10 PM (22:00)
  return hours >= 8 && hours <= 22;
}

export function calculateEndTime(startTime: Date): Date {
  return addHours(startTime, 1);
}