
export function validateBookingTime(date: Date | undefined, time: string | null): string | null {
  if (!date || !time) return "Selecciona una fecha y hora";

  const now = new Date();
  const [hours] = time.split(":");
  const bookingTime = new Date(date);
  bookingTime.setHours(parseInt(hours), 0, 0, 0);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Fecha inválida";
  }

  // Check if time is valid
  if (!/^([0-9]|0[0-9]|1[0-9]|2[0-3]):00$/.test(time)) {
    return "Formato de hora inválido. Debe ser HH:00";
  }

  // Check if the booking is in the past
  if (bookingTime < now) {
    return "No se pueden hacer reservas para fechas pasadas";
  }

  const hoursDifference = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Check if booking is at least 2 hours in advance
  if (hoursDifference < 2) {
    return "Las reservas deben hacerse con al menos 2 horas de anticipación";
  }

  return null;
}
