
import { CourtTypeSelector } from "@/components/CourtTypeSelector";
import { TimeSlotSelector } from "@/components/TimeSlotSelector";
import { useNavigate } from "react-router-dom";
import { useBookingSubmit } from "./booking/useBookingSubmit";
import { BookingButton } from "./booking/BookingButton";
import { useBookingState } from "./booking/useBookingState";
import { useBookingLogic } from "./booking/useBookingLogic";
import { CourtTypeDisplay } from "./booking/CourtTypeDisplay";
import { BookingRulesInfo } from "./booking/BookingRulesInfo";
import { CourtSelection } from "./booking/CourtSelection";
import { MaxBookingsAlert } from "./booking/MaxBookingsAlert";
import { DisabledReasonInfo } from "./booking/DisabledReasonInfo";

interface BookingFormProps {
  selectedDate?: Date;
  onBookingSuccess: () => void;
  initialCourtType?: 'tennis' | 'padel' | null;
  onCourtTypeChange?: (courtType: 'tennis' | 'padel' | null) => void;
}

export function BookingForm({ selectedDate, onBookingSuccess, initialCourtType, onCourtTypeChange }: BookingFormProps) {
  const navigate = useNavigate();
  const { handleBooking, isSubmitting } = useBookingSubmit(onBookingSuccess);
  
  const {
    selectedCourtType,
    selectedCourt,
    selectedTime,
    courts,
    setSelectedCourt,
    setSelectedTime,
    handleCourtTypeSelect,
    handleBackToTypeSelection,
  } = useBookingState(initialCourtType);

  const {
    user,
    bookingRules,
    userActiveBookings,
    bookedSlots,
  } = useBookingLogic(selectedDate, selectedCourtType);

  console.log('BookingForm - selectedCourtType:', selectedCourtType);
  console.log('BookingForm - bookingRules:', bookingRules);
  console.log('BookingForm - maxActiveBookings:', bookingRules?.max_active_bookings || 4);
  console.log('BookingForm - userActiveBookings from profiles:', userActiveBookings);

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const handleCourtTypeSelectWithCallback = (type: 'tennis' | 'padel') => {
    handleCourtTypeSelect(type);
    onCourtTypeChange?.(type);
  };

  const handleBackToTypeSelectionWithCallback = () => {
    handleBackToTypeSelection();
    onCourtTypeChange?.(null);
  };

  // Función para determinar por qué el botón está deshabilitado
  const getDisabledReason = () => {
    if (!user) return null;
    const maxBookings = bookingRules?.max_active_bookings || 4;
    if (userActiveBookings >= maxBookings) return `Ya tienes el máximo de ${maxBookings} reservas activas`;
    if (!selectedDate) return "Selecciona una fecha";
    if (!selectedCourtType) return "Selecciona un tipo de cancha";
    // Solo mostrar el mensaje de seleccionar cancha si hay más de una cancha disponible
    if (courts.length > 1 && !selectedCourt) return "Selecciona una cancha específica";
    if (!selectedTime) return "Selecciona un horario";
    return null;
  };

  const disabledReason = getDisabledReason();
  const isButtonDisabled = !!disabledReason || isSubmitting;
  const maxBookings = bookingRules?.max_active_bookings || 4;

  // Si no hay tipo de cancha seleccionado, mostrar selector de tipo
  if (!selectedCourtType) {
    return (
      <div className="space-y-4">
        <CourtTypeSelector
          selectedType={selectedCourtType}
          onTypeSelect={handleCourtTypeSelectWithCallback}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MaxBookingsAlert 
        userActiveBookings={userActiveBookings}
        maxBookings={maxBookings}
        selectedCourtType={selectedCourtType}
      />

      <div className="space-y-4">
        <CourtTypeDisplay 
          selectedCourtType={selectedCourtType}
          onBackToTypeSelection={handleBackToTypeSelectionWithCallback}
        />

        <BookingRulesInfo 
          bookingRules={bookingRules}
          selectedCourtType={selectedCourtType}
        />

        <CourtSelection 
          courts={courts}
          selectedCourt={selectedCourt}
          onCourtSelect={setSelectedCourt}
        />
        
        {/* Mostrar selector de horarios cuando se haya seleccionado el tipo de cancha */}
        {selectedDate && (
          <TimeSlotSelector
            selectedDate={selectedDate}
            courtType={selectedCourtType}
            bookedSlots={bookedSlots}
            selectedTime={selectedTime}
            onTimeSelect={setSelectedTime}
            businessHours={{ start: 8, end: 22 }}
          />
        )}
      </div>

      <DisabledReasonInfo 
        disabledReason={disabledReason}
        isAuthenticated={!!user}
      />

      {/* Botón de reserva */}
      <BookingButton 
        isSubmitting={isSubmitting}
        isDisabled={isButtonDisabled}
        onClick={() => {
          console.log('Attempting booking with:', {
            selectedDate,
            selectedTime,
            selectedCourt,
            selectedCourtType
          });
          handleBooking(selectedDate, selectedTime, selectedCourt, selectedCourtType);
        }}
        loginRedirect={handleLoginRedirect}
        isAuthenticated={!!user}
      />
    </div>
  );
}
