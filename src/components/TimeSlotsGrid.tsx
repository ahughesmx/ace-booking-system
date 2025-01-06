import { TimeSlot } from "./TimeSlot";
import { format, addHours, isBefore, isToday } from "date-fns";
import { useCourts } from "@/hooks/use-courts";

interface TimeSlot {
  start: string;
  end: string;
  isPast: boolean;
}

interface TimeSlotsGridProps {
  bookedSlots: Set<string>;
  businessHours: {
    start: number;
    end: number;
  };
  selectedDate?: Date;
}

function generateTimeSlots(businessHours: { start: number; end: number }, selectedDate: Date = new Date()) {
  const slots: TimeSlot[] = [];
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

export function TimeSlotsGrid({ bookedSlots, businessHours, selectedDate }: TimeSlotsGridProps) {
  const timeSlots = generateTimeSlots(businessHours, selectedDate);
  const { data: courts = [] } = useCourts();
  const totalCourts = courts.length;

  // Función para contar cuántas reservas hay en un horario específico
  const getBookingsCountForSlot = (slot: string) => {
    return bookedSlots.has(slot) ? 1 : 0; // Contamos cada reserva individual
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {timeSlots.map(timeSlot => {
        const bookingsCount = getBookingsCountForSlot(timeSlot.start);
        const availableSlots = totalCourts - bookingsCount;
        const isAvailable = !timeSlot.isPast && availableSlots > 0;
        
        return (
          <TimeSlot
            key={timeSlot.start}
            start={timeSlot.start}
            end={timeSlot.end}
            isAvailable={isAvailable}
            availableCount={availableSlots}
          />
        );
      })}
    </div>
  );
}