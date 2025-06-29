
import { useState, useEffect } from "react";
import { useCourts } from "@/hooks/use-courts";

export function useBookingState(initialCourtType?: 'tennis' | 'padel' | null) {
  const [selectedCourtType, setSelectedCourtType] = useState<'tennis' | 'padel' | null>(initialCourtType || null);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const { data: courts = [] } = useCourts(selectedCourtType);

  // Actualizar el tipo de cancha inicial
  useEffect(() => {
    if (initialCourtType && initialCourtType !== selectedCourtType) {
      setSelectedCourtType(initialCourtType);
    }
  }, [initialCourtType]);

  // Selección automática de cancha cuando solo hay una disponible
  useEffect(() => {
    if (courts.length === 1 && !selectedCourt) {
      setSelectedCourt(courts[0].id);
      console.log('Auto-selecting single court:', courts[0].id);
    } else if (courts.length !== 1 && selectedCourt) {
      // Si había una cancha seleccionada automáticamente pero ahora hay más opciones, resetear
      const courtExists = courts.some(court => court.id === selectedCourt);
      if (!courtExists) {
        setSelectedCourt(null);
      }
    }
  }, [courts, selectedCourt]);

  const handleCourtTypeSelect = (type: 'tennis' | 'padel') => {
    setSelectedCourtType(type);
    setSelectedCourt(null);
    setSelectedTime(null);
  };

  const handleBackToTypeSelection = () => {
    setSelectedCourtType(null);
    setSelectedCourt(null);
    setSelectedTime(null);
  };

  return {
    selectedCourtType,
    selectedCourt,
    selectedTime,
    courts,
    setSelectedCourt,
    setSelectedTime,
    handleCourtTypeSelect,
    handleBackToTypeSelection,
  };
}
