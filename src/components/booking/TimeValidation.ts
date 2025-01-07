import { addHours, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { zonedTimeToUtc } from 'date-fns-tz';

export function normalizeDateTime(date: Date, timeString: string): Date {
  const [hours] = timeString.split(":");
  const normalizedDate = new Date(date);
  
  // Set the time components
  const dateWithTime = setMilliseconds(
    setSeconds(
      setMinutes(
        setHours(normalizedDate, parseInt(hours)),
        0
      ),
      0
    ),
    0
  );

  // Convert to UTC while considering Mexico City timezone
  return zonedTimeToUtc(dateWithTime, 'America/Mexico_City');
}

export function createBookingTimes(date: Date | undefined, timeString: string | null) {
  if (!date || !timeString) return null;

  const startTime = normalizeDateTime(date, timeString);
  const endTime = addHours(startTime, 1);

  // Log para debugging
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