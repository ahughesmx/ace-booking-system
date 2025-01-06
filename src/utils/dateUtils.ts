export const createBookingDateTime = (date: Date, timeString: string): Date => {
  const [hours] = timeString.split(':');
  const bookingTime = new Date(date);
  bookingTime.setHours(parseInt(hours), 0, 0, 0);
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
  
  if (hoursDifference < 2) return false;

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