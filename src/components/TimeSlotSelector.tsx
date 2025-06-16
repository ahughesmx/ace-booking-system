
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, addHours, isBefore, isToday } from "date-fns";
import { useCourts } from "@/hooks/use-courts";

interface TimeSlotSelectorProps {
  selectedDate?: Date;
  courtType?: 'tennis' | 'padel' | null;
  bookedSlots: Set<string>;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  businessHours: {
    start: number;
    end: number;
  };
}

function generateTimeSlots(businessHours: { start: number; end: number }, selectedDate: Date = new Date()) {
  const slots = [];
  const now = new Date();
  
  for (let hour = businessHours.start; hour <= businessHours.end; hour++) {
    const startTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour);
    const endTime = addHours(startTime, 1);
    
    // Solo verificar si está en el pasado cuando es el día actual
    const isPast = isToday(selectedDate) ? isBefore(startTime, now) : false;
    
    slots.push({
      start: format(startTime, "HH:00"),
      end: format(endTime, "HH:00"),
      isPast
    });
  }
  return slots;
}

export function TimeSlotSelector({ 
  selectedDate, 
  courtType, 
  bookedSlots, 
  selectedTime, 
  onTimeSelect, 
  businessHours 
}: TimeSlotSelectorProps) {
  const { data: courts = [] } = useCourts(courtType);
  const totalCourts = courts.length;
  const timeSlots = generateTimeSlots(businessHours, selectedDate);

  console.log('TimeSlotSelector - courtType:', courtType);
  console.log('TimeSlotSelector - courts:', courts);
  console.log('TimeSlotSelector - totalCourts:', totalCourts);
  console.log('TimeSlotSelector - bookedSlots:', Array.from(bookedSlots));
  console.log('TimeSlotSelector - selectedTime:', selectedTime);

  const getAvailableSlots = (slot: string) => {
    if (totalCourts === 0) return 0;
    
    // Contar cuántas reservas hay para este horario específico del tipo de cancha seleccionado
    const bookingsCount = bookedSlots.has(slot) ? 1 : 0;
    const available = Math.max(0, totalCourts - bookingsCount);
    
    console.log(`Slot ${slot}: totalCourts=${totalCourts}, bookingsCount=${bookingsCount}, available=${available}`);
    
    return available;
  };

  if (totalCourts === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h4 className="text-lg font-semibold text-[#1e3a8a] mb-2">
            Selecciona tu horario para {courtType}
          </h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">
              No hay canchas de {courtType} disponibles en el sistema
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-lg font-semibold text-[#1e3a8a] mb-2">
          Selecciona tu horario para {courtType}
        </h4>
        <p className="text-sm text-muted-foreground">
          {totalCourts} {totalCourts === 1 ? 'cancha disponible' : 'canchas disponibles'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {timeSlots.map(timeSlot => {
          const availableSlots = getAvailableSlots(timeSlot.start);
          const isAvailable = !timeSlot.isPast && availableSlots > 0;
          const isSelected = selectedTime === timeSlot.start;
          
          console.log(`TimeSlot ${timeSlot.start}: isPast=${timeSlot.isPast}, availableSlots=${availableSlots}, isAvailable=${isAvailable}`);
          
          return (
            <Button
              key={timeSlot.start}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "h-auto p-3 flex flex-col items-center justify-center space-y-1 transition-all",
                isAvailable 
                  ? "hover:bg-[#6898FE]/10 hover:border-[#6898FE] border-[#6898FE]/20" 
                  : "opacity-50 cursor-not-allowed bg-gray-50",
                isSelected && "bg-[#6898FE] text-white border-[#6898FE]"
              )}
              disabled={!isAvailable}
              onClick={() => {
                console.log(`Clicking time slot: ${timeSlot.start}, isAvailable: ${isAvailable}`);
                if (isAvailable) {
                  onTimeSelect(timeSlot.start);
                }
              }}
            >
              <span className="font-medium text-sm">
                {timeSlot.start} - {timeSlot.end}
              </span>
              <span className={cn(
                "text-xs",
                isSelected ? "text-white/80" : isAvailable ? "text-[#6898FE]" : "text-gray-500"
              )}>
                {timeSlot.isPast 
                  ? "Horario pasado"
                  : availableSlots > 0 
                    ? `${availableSlots} ${availableSlots === 1 ? 'disponible' : 'disponibles'}`
                    : "No disponible"
                }
              </span>
            </Button>
          );
        })}
      </div>

      {selectedTime && (
        <div className="bg-[#6898FE]/10 border border-[#6898FE]/20 rounded-lg p-3 text-center">
          <p className="text-sm text-[#1e3a8a]">
            ✓ Horario seleccionado: <span className="font-semibold">{selectedTime}</span>
          </p>
        </div>
      )}
    </div>
  );
}
