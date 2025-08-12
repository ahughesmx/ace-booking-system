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

interface BookingFormProps {
  selectedDate?: Date;
  onBookingSuccess: () => void;
  initialCourtType?: string | null;
  onCourtTypeChange?: (courtType: string | null) => void;
}

export function BookingForm({ selectedDate, onBookingSuccess, initialCourtType, onCourtTypeChange }: BookingFormProps) {
  console.log('🟢 BookingForm RENDER - selectedDate:', selectedDate, 'initialCourtType:', initialCourtType);
  
  // Temporalmente renderizar solo un elemento simple para verificar que el componente funciona
  return (
    <div className="p-4 border border-green-500 bg-green-50">
      <h3 className="text-lg font-bold text-green-800">🟢 BookingForm está funcionando!</h3>
      <p>Fecha: {selectedDate?.toDateString()}</p>
      <p>Tipo de cancha: {initialCourtType}</p>
      <button 
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => {
          alert('🔘 Botón funcionando!');
          console.log('🔘 Botón simple funcionando!');
        }}
      >
        Botón de prueba
      </button>
    </div>
  );
}