
interface BookingRulesInfoProps {
  bookingRules: any;
  selectedCourtType: 'tennis' | 'padel';
}

export function BookingRulesInfo({ bookingRules, selectedCourtType }: BookingRulesInfoProps) {
  if (!bookingRules) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <p className="text-sm text-blue-800">
        <span className="font-medium">Reglas para {selectedCourtType === 'tennis' ? 'tenis' : 'pádel'}:</span> 
        {` Máximo ${bookingRules.max_active_bookings} reservas activas, `}
        {`reservar hasta ${bookingRules.max_days_ahead} días adelante`}
      </p>
    </div>
  );
}
