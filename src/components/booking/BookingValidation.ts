export function validateBookingTime(date: Date | undefined, time: string | null): string | null {
  if (!date || !time) return "Selecciona una fecha y hora";

  const now = new Date();
  const [hours] = time.split(":");
  const bookingTime = new Date(date);
  bookingTime.setHours(parseInt(hours), 0, 0, 0);

  const hoursDifference = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursDifference < 2) {
    return "Las reservas deben hacerse con al menos 2 horas de anticipación";
  }

  return null;
}