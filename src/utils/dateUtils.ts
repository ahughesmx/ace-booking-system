import { format, addHours, isBefore, isAfter, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const createBookingDateTime = (date: Date, hours: string): Date => {
  // Create a base date with the selected hours
  const baseDate = setHours(
    setMinutes(
      setSeconds(
        setMilliseconds(date, 0),
        0
      ),
      0
    ),
    parseInt(hours)
  );

  // Convert the local time to Mexico City time
  const mexicoCityTime = toZonedTime(baseDate, 'America/Mexico_City');
  
  return mexicoCityTime;
};

export const isTimeSlotAvailable = (
  selectedDate: Date,
  hours: string,
  existingBookings: Array<{ start_time: string; end_time: string }> = []
): boolean => {
  const bookingTime = createBookingDateTime(selectedDate, hours);
  
  // Don't allow bookings in the past
  const now = new Date();
  if (isBefore(bookingTime, now)) return false;

  // Calculate hours difference for the 2-hour advance booking requirement
  const hoursDifference = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursDifference < 2) return false;

  // Don't allow bookings outside business hours (8:00 - 22:00)
  const bookingHour = parseInt(hours);
  if (bookingHour < 8 || bookingHour >= 22) return false;

  // Check for conflicts with existing bookings
  const timeSlotStart = createBookingDateTime(selectedDate, hours);
  const timeSlotEnd = addHours(timeSlotStart, 1);

  return !existingBookings.some(booking => {
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);
    
    return (
      (isAfter(timeSlotStart, bookingStart) && isBefore(timeSlotStart, bookingEnd)) ||
      (isAfter(timeSlotEnd, bookingStart) && isBefore(timeSlotEnd, bookingEnd)) ||
      (isBefore(timeSlotStart, bookingStart) && isAfter(timeSlotEnd, bookingEnd))
    );
  });
};

export const formatBookingTime = (date: string): string => {
  const mexicoCityTime = toZonedTime(new Date(date), 'America/Mexico_City');
  return format(mexicoCityTime, 'HH:mm');
};