
import { useState, useEffect } from "react";
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
import { BookingSummary } from "./booking/BookingSummary";
import { useBookingPayment } from "./booking/useBookingPayment";
import { useAvailableCourtTypes } from "@/hooks/use-available-court-types";

interface BookingFormProps {
  selectedDate?: Date;
  onBookingSuccess: () => void;
  initialCourtType?: string | null;
  onCourtTypeChange?: (courtType: string | null) => void;
}

export function BookingForm({ selectedDate, onBookingSuccess, initialCourtType, onCourtTypeChange }: BookingFormProps) {
  const navigate = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const { handleBooking, isSubmitting } = useBookingSubmit(onBookingSuccess);
  const { 
    createPendingBooking, 
    processPayment, 
    cancelPendingBooking, 
    pendingBooking, 
    isCreatingBooking 
  } = useBookingPayment();
  
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

  // Verificar tipos disponibles para auto-selección
  const { data: availableTypes = [] } = useAvailableCourtTypes(true);

  const {
    user,
    bookingRules,
    userActiveBookings,
    bookedSlots,
  } = useBookingLogic(selectedDate, selectedCourtType);

  console.log('BookingForm - selectedCourtType:', selectedCourtType);
  console.log('BookingForm - availableTypes:', availableTypes);
  console.log('BookingForm - availableTypes.length:', availableTypes.length);
  
  // Auto-selección removida para evitar conflictos con BookingCalendar
  // La lógica de auto-selección está centralizada en BookingCalendar

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const handleShowSummary = async () => {
    if (!selectedDate || !selectedTime || !selectedCourtType || !selectedCourt) {
      return;
    }

    try {
      await createPendingBooking({
        selectedDate,
        selectedTime,
        selectedCourt,
        selectedCourtType
      });
      setShowSummary(true);
    } catch (error) {
      console.error("Error creating pending booking:", error);
    }
  };

  const handleConfirmPayment = async (paymentGateway: string) => {
    try {
      await processPayment(paymentGateway);
      setShowSummary(false);
      onBookingSuccess();
    } catch (error) {
      console.error("Error processing payment:", error);
    }
  };

  const handleCancelPayment = async () => {
    await cancelPendingBooking();
    setShowSummary(false);
  };

  const handleCourtTypeSelectWithCallback = (type: string) => {
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
  const isButtonDisabled = !!disabledReason || isSubmitting || isCreatingBooking;
  const maxBookings = bookingRules?.max_active_bookings || 4;

  // Si se está mostrando el resumen de pago
  console.log('🔍 BookingSummary check - showSummary:', showSummary, 'pendingBooking:', !!pendingBooking);
  if (showSummary && pendingBooking) {
    const court = courts.find(c => c.id === selectedCourt);
    return (
      <div className="flex justify-center">
        <BookingSummary
          date={selectedDate!}
          time={selectedTime!}
          courtType={selectedCourtType!}
          courtName={court?.name || 'Cancha'}
          onConfirm={handleConfirmPayment}
          onCancel={handleCancelPayment}
          isLoading={isSubmitting}
        />
      </div>
    );
  }

  // Si no hay tipo de cancha seleccionado, verificar si necesitamos mostrar selector
  // Solo mostrar selector si hay datos de tipos disponibles Y hay más de un tipo O no hay tipos
  const shouldShowSelector = !selectedCourtType && availableTypes.length > 1;
  const isLoadingTypes = availableTypes.length === 0;
  
  console.log('BookingForm - shouldShowSelector:', shouldShowSelector);
  console.log('BookingForm - isLoadingTypes:', isLoadingTypes);
  
  if (isLoadingTypes) {
    return <div className="text-center py-4">Cargando tipos de cancha...</div>;
  }
  
  if (shouldShowSelector) {
    console.log('🚨 SHOWING SELECTOR because shouldShowSelector is TRUE');
    return (
      <div className="space-y-4">
        <CourtTypeSelector
          selectedType={selectedCourtType}
          onTypeSelect={handleCourtTypeSelectWithCallback}
        />
      </div>
    );
  }

  console.log('✅ NOT SHOWING SELECTOR - proceeding to main content');

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
        isSubmitting={isCreatingBooking}
        isDisabled={isButtonDisabled}
        onClick={handleShowSummary}
        loginRedirect={handleLoginRedirect}
        isAuthenticated={!!user}
      />
    </div>
  );
}
