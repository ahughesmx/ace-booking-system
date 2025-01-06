export const createBookingDateTime = (date: Date, timeString: string): Date => {
  const [hours] = timeString.split(':');
  const bookingTime = new Date(date);
  bookingTime.setHours(parseInt(hours), 0, 0, 0);
  
  // Set the timezone offset for Mexico City (UTC-6)
  const mexicoCityOffset = -6 * 60;
  const localOffset = bookingTime.getTimezoneOffset();
  const offsetDiff = localOffset - mexicoCityOffset;
  
  // Adjust the time by the offset difference
  bookingTime.setMinutes(bookingTime.getMinutes() + offsetDiff);
  
  return bookingTime;
};

export const isTimeSlotAvailable = (
  time: string,
  selectedDate: Date | undefined,
  existingBookings: any[],
  courtId: string
): boolean => {
  if (!selectedDate) return false;
  
  const [hours] = time.split(':');
  const bookingTime = new Date(selectedDate);
  bookingTime.setHours(parseInt(hours), 0, 0, 0);
  const now = new Date();
  const hoursDifference = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Don't allow bookings less than 2 hours in advance
  if (hoursDifference < 2) return false;

  // Don't allow bookings outside business hours (8:00 - 22:00)
  const bookingHour = parseInt(hours);
  if (bookingHour < 8 || bookingHour >= 22) return false;

  const timeSlotStart = new Date(selectedDate);
  timeSlotStart.setHours(parseInt(hours), 0, 0, 0);
  const timeSlotEnd = new Date(timeSlotStart);
  timeSlotEnd.setHours(timeSlotStart.getHours() + 1);

  return !existingBookings.some(booking => {
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);
    return (
      (timeSlotStart >= bookingStart && timeSlotStart < bookingEnd) ||
      (timeSlotEnd > bookingStart && timeSlotEnd <= bookingEnd)
    );
  });
};