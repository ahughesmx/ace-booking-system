import { addHours, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";

export function normalizeDateTime(date: Date, timeString: string): Date {
  const [hours] = timeString.split(":");
  const normalizedDate = new Date(date);
  return setMilliseconds(
    setSeconds(
      setMinutes(
        setHours(normalizedDate, parseInt(hours)),
        0
      ),
      0
    ),
    0
  );
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