
import { useState, useEffect } from "react";
import { useCourts } from "@/hooks/use-courts";
import { useAvailableCourtTypes } from "@/hooks/use-available-court-types";

export function useBookingState(initialCourtType?: string | null) {
  const { data: availableTypes = [] } = useAvailableCourtTypes(true); // Solo tipos habilitados
  const [selectedCourtType, setSelectedCourtType] = useState<string | null>(initialCourtType || null);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const { data: courts = [] } = useCourts(selectedCourtType);

  // Auto-seleccionar tipo de cancha cuando solo hay uno habilitado
  useEffect(() => {
    console.log('useBookingState - Auto-selection check:', {
      selectedCourtType,
      initialCourtType,
      availableTypesLength: availableTypes.length,
      availableTypes: availableTypes.map(t => ({ name: t.type_name, enabled: t.is_enabled }))
    });
    
    // Solo auto-seleccionar si no hay tipo seleccionado ni inicial y hay exactamente un tipo disponible
    if (!selectedCourtType && !initialCourtType && availableTypes.length === 1) {
      const singleType = availableTypes[0].type_name;
      console.log('AUTO-SELECTING single court type:', singleType);
      setSelectedCourtType(singleType);
    }
  }, [availableTypes, selectedCourtType, initialCourtType]);

  // Actualizar el tipo de cancha inicial
  useEffect(() => {
    if (initialCourtType && initialCourtType !== selectedCourtType) {
      setSelectedCourtType(initialCourtType);
    }
  }, [initialCourtType, selectedCourtType]);

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

  const handleCourtTypeSelect = (type: string) => {
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
    setSelectedTime: (time: string | null) => {
      console.log('🎯 useBookingState.setSelectedTime called with:', time);
      setSelectedTime(time);
    },
    handleCourtTypeSelect,
    handleBackToTypeSelection,
  };
}
