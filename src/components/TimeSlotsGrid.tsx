
import { TimeSlot } from "./TimeSlot";
import { format, addHours, isBefore, isToday } from "date-fns";
import { useCourts } from "@/hooks/use-courts";
import { useAllBookings } from "@/hooks/use-bookings";

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
  courtType?: 'tennis' | 'padel' | null;
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

export function TimeSlotsGrid({ bookedSlots, businessHours, selectedDate, courtType }: TimeSlotsGridProps) {
  const timeSlots = generateTimeSlots(businessHours, selectedDate);
  // Obtener canchas filtradas por tipo cuando se haya seleccionado un tipo
  const { data: courts = [] } = useCourts(courtType);
  // Obtener todas las reservas (normales + especiales) para calcular disponibilidad
  const { data: allBookings = [] } = useAllBookings(selectedDate);
  const totalCourts = courts.length;

  console.log("TimeSlotsGrid - Court type:", courtType);
  console.log("TimeSlotsGrid - Courts:", courts);
  console.log("TimeSlotsGrid - Total courts:", totalCourts);
  console.log("TimeSlotsGrid - All bookings:", allBookings);

  // Función para contar cuántas reservas hay en un horario específico incluyendo especiales
  const getBookingsCountForSlot = (slot: string) => {
    const bookingsInSlot = allBookings.filter(booking => {
      const bookingHour = format(new Date(booking.start_time), "HH:00");
      const bookingCourtType = booking.court?.court_type;
      
      // Solo contar reservas del tipo de cancha seleccionado
      if (courtType && bookingCourtType !== courtType) {
        return false;
      }
      
      return bookingHour === slot;
    });
    
    return bookingsInSlot.length;
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
