
import { addHours, setHours, setMinutes, setSeconds, setMilliseconds } from "https://esm.sh/date-fns@2.30.0";

export function normalizeDateTime(date: Date, timeString: string): Date {
  // Parse the time string (format: "HH:00")
  const [hours] = timeString.split(':').map(Number);
  
  // Create a new date with the specified time
  let normalizedDate = setHours(date, hours);
  normalizedDate = setMinutes(normalizedDate, 0);
  normalizedDate = setSeconds(normalizedDate, 0);
  normalizedDate = setMilliseconds(normalizedDate, 0);
  
  return normalizedDate;
}

export function calculateEndTime(startTime: Date): Date {
  return addHours(startTime, 1);
}

export function createBookingTimes(date: Date | undefined, timeString: string | null) {
  if (!date || !timeString) return null;

  const startTime = normalizeDateTime(date, timeString);
  const endTime = addHours(startTime, 1);

  // Log for debugging
  console.log('Booking times:', {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    localStartTime: startTime.toString(),
    localEndTime: endTime.toString()
  });

  return {
    startTime,
    endTime
  };
}
