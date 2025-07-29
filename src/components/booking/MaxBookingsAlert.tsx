
import { BookingAlert } from "./BookingAlert";

interface MaxBookingsAlertProps {
  userActiveBookings: number;
  maxBookings: number;
  selectedCourtType: string;
}

export function MaxBookingsAlert({ userActiveBookings, maxBookings, selectedCourtType }: MaxBookingsAlertProps) {
  if (userActiveBookings < maxBookings) return null;

  return (
    <BookingAlert 
      message={`Ya tienes el máximo de ${maxBookings} reservas activas permitidas para ${selectedCourtType === 'tennis' ? 'tenis' : 'pádel'}. Debes esperar a que finalicen o cancelar alguna reserva existente.`}
    />
  );
}
