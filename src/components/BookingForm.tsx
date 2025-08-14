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
import { useToast } from "@/hooks/use-toast";
import { UserSelector } from "./booking/UserSelector";
import { TicketReceipt } from "./booking/TicketReceipt";
import { useAuth } from "@/components/AuthProvider";
import { useGlobalRole } from "@/hooks/use-global-role";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

interface BookingFormProps {
  selectedDate?: Date;
  onBookingSuccess: () => void;
  initialCourtType?: string | null;
  onCourtTypeChange?: (courtType: string | null) => void;
}

export function BookingForm({ selectedDate, onBookingSuccess, initialCourtType, onCourtTypeChange }: BookingFormProps) {
  console.log('🟢 BookingForm RENDER - selectedDate:', selectedDate, 'initialCourtType:', initialCourtType);
  const navigate = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: userRole } = useGlobalRole(user?.id);
  const { handleBooking, isSubmitting } = useBookingSubmit(onBookingSuccess);
  const { 
    createPendingBooking, 
    processPayment, 
    cancelPendingBooking, 
    pendingBooking, 
    isCreatingBooking 
  } = useBookingPayment();

  // Verificar si el usuario es operador
  const isOperator = userRole?.role === 'operador';

  // Hook para obtener información del usuario seleccionado
  const { data: selectedUserData } = useQuery({
    queryKey: ["selectedUser", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", selectedUserId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserId,
  });

  // Actualizar el nombre del usuario seleccionado
  useEffect(() => {
    if (selectedUserData) {
      setSelectedUserName(selectedUserData.full_name || "Usuario sin nombre");
    }
  }, [selectedUserData]);
  
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
    user: bookingUser,
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
    console.log('🎯 handleShowSummary called with:', {
      selectedDate: selectedDate?.toISOString(),
      selectedTime,
      selectedCourtType,
      selectedCourt,
      selectedUserId,
      isOperator,
      bookingRules: bookingRules ? {
        maxDaysAhead: bookingRules.max_days_ahead,
        courtType: bookingRules.court_type
      } : 'no rules'
    });

    console.log('🔍 Validation check - missing fields:', {
      hasDate: !!selectedDate,
      hasTime: !!selectedTime,
      hasCourtType: !!selectedCourtType,
      hasCourt: !!selectedCourt,
      hasSelectedUser: isOperator ? !!selectedUserId : true,
      isOperatorCheck: isOperator,
      selectedUserIdValue: selectedUserId
    });

    if (!selectedDate || !selectedTime || !selectedCourtType || !selectedCourt) {
      console.log('❌ Missing required fields for booking:', {
        hasDate: !!selectedDate,
        hasTime: !!selectedTime,
        hasCourtType: !!selectedCourtType,
        hasCourt: !!selectedCourt
      });
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    // Si es operador, debe seleccionar un usuario
    if (isOperator && !selectedUserId) {
      console.log('❌ Operador sin usuario seleccionado');
      toast({
        title: "Usuario requerido",
        description: "Debes seleccionar un usuario para realizar la reserva",
        variant: "destructive",
      });
      return;
    }

    // Verificar reglas de reserva antes de crear
    if (bookingRules) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysDiff = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log('📅 VALIDATION CHECK:', {
        today: today.toDateString(),
        selectedDate: selectedDate.toDateString(),
        daysDiff,
        maxDaysAhead: bookingRules.max_days_ahead,
        isValid: daysDiff <= bookingRules.max_days_ahead
      });
      
      if (daysDiff > bookingRules.max_days_ahead) {
        console.error('❌ Cannot book more than', bookingRules.max_days_ahead, 'days ahead');
        toast({
          title: "Reserva no permitida",
          description: `No puedes reservar más de ${bookingRules.max_days_ahead} días por adelantado para ${selectedCourtType}`,
          variant: "destructive",
        });
        return;
      }
    }

    console.log('✅ All validations passed, proceeding to create pending booking...');

    try {
      console.log('💰 Creating pending booking...');
      await createPendingBooking({
        selectedDate,
        selectedTime,
        selectedCourt,
        selectedCourtType,
        forUserId: isOperator ? selectedUserId : undefined
      });
      console.log('✅ Pending booking created, showing summary');
      setShowSummary(true);
    } catch (error) {
      console.error("❌ Error creating pending booking:", error);
    }
  };

  const handleConfirmPayment = async (paymentGateway: string) => {
    console.log(`🔄 handleConfirmPayment called with ${paymentGateway}`, { 
      pendingBooking: !!pendingBooking, 
      isSubmitting 
    });
    
    try {
      const result = await processPayment(paymentGateway);
      console.log(`✅ Payment processed successfully for ${paymentGateway}`, result);
      
      // Si es pago en efectivo (operador), generar ticket con folio real
      if (paymentGateway === 'efectivo' && isOperator && pendingBooking && typeof result === 'object') {
        const court = courts.find(c => c.id === selectedCourt);
        
        // Crear folio real en la base de datos
        let finalReceiptNumber = `COB-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
        
        try {
          const { data: receiptNumber, error: receiptError } = await supabase
            .rpc('create_receipt_number', { p_booking_id: pendingBooking.id });
          
          if (!receiptError && receiptNumber) {
            finalReceiptNumber = receiptNumber;
            console.log("✅ Receipt number created:", finalReceiptNumber);
          } else {
            console.error("❌ Error creating receipt number:", receiptError);
          }
        } catch (error) {
          console.error("❌ Error in receipt creation:", error);
        }
        
        const ticketData = {
          courtName: court?.name || 'Cancha',
          courtType: selectedCourtType!,
          date: selectedDate!,
          time: selectedTime!,
          duration: 1,
          amount: result.amount || 0,
          paymentMethod: 'Efectivo',
          userName: selectedUserName,
          operatorName: user?.user_metadata?.full_name || user?.email || 'Operador',
          receiptNumber: finalReceiptNumber
        };
        setTicketData(ticketData);
        setShowTicket(true);
      }
      
      setShowSummary(false);
      onBookingSuccess();
    } catch (error) {
      console.error(`❌ Error processing payment for ${paymentGateway}:`, error);
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
    if (isOperator && !selectedUserId) return "Selecciona el usuario para la reserva";
    return null;
  };

  const disabledReason = getDisabledReason();
  const isButtonDisabled = !!disabledReason || isSubmitting || isCreatingBooking;
  const maxBookings = bookingRules?.max_active_bookings || 4;

  console.log('🔍 Button state check:', {
    disabledReason,
    isButtonDisabled,
    isSubmitting,
    isCreatingBooking,
    selectedDate: !!selectedDate,
    selectedTime: !!selectedTime,
    selectedCourtType: !!selectedCourtType,
    selectedCourt: !!selectedCourt,
    courtsLength: courts.length,
    user: !!user,
    userActiveBookings,
    maxBookings
  });

  // Si se está mostrando el ticket
  if (showTicket && ticketData) {
    return (
      <div className="flex justify-center">
        <TicketReceipt
          bookingData={ticketData}
          onClose={() => {
            setShowTicket(false);
            setTicketData(null);
          }}
          onPrint={undefined} // La función de impresión ahora está integrada en el componente
        />
      </div>
    );
  }

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
          isOperator={isOperator}
          selectedUserName={selectedUserName}
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

        {/* Selector de usuario para operadores */}
        {isOperator && (
          <UserSelector
            onUserSelect={setSelectedUserId}
            selectedUserId={selectedUserId}
            selectedUserName={selectedUserName}
          />
        )}

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
            isOperator={isOperator}
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