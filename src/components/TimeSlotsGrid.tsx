
import { TimeSlot } from "./TimeSlot";
import { format, addHours, isBefore, isToday } from "date-fns";
import { useCourts } from "@/hooks/use-courts";
import { useAllBookings } from "@/hooks/use-bookings";
import { Booking, SpecialBooking } from "@/types/booking";

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

  // Función para obtener el nombre del usuario que reservó un slot
  const getBookedUserForSlot = (slot: string) => {
    const booking = allBookings.find(booking => {
      if (booking.isSpecial) return false;
      
      const bookingHour = format(new Date(booking.start_time), "HH:00");
      const bookingCourtType = booking.court?.court_type;
      
      // Solo contar reservas del tipo de cancha seleccionado
      if (courtType && bookingCourtType !== courtType) {
        return false;
      }
      
      return bookingHour === slot;
    });
    
    return booking?.user?.full_name || null;
  };

  // Función para verificar si hay eventos especiales en un slot
  const getSpecialEventsForSlot = (slot: string) => {
    return allBookings.filter(booking => {
      if (!booking.isSpecial) return false;
      
      const bookingCourtType = booking.court?.court_type;
      
      // Solo verificar eventos especiales del tipo de cancha seleccionado
      if (courtType && bookingCourtType !== courtType) {
        return false;
      }
      
      // Verificar si el slot está dentro del rango de la reserva especial
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      const slotHour = parseInt(slot.split(':')[0]);
      
      // Crear fecha del slot para comparar
      const slotStart = new Date(selectedDate || new Date());
      slotStart.setHours(slotHour, 0, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotHour + 1, 0, 0, 0);
      
      // Verificar si hay superposición
      return slotStart < bookingEnd && slotEnd > bookingStart;
    }) as SpecialBooking[];
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {timeSlots.map(timeSlot => {
        const specialEvents = getSpecialEventsForSlot(timeSlot.start);
        const hasSpecialEvents = specialEvents.length > 0;
        
        // Si hay eventos especiales, el slot no está disponible
        if (hasSpecialEvents) {
          return (
            <TimeSlot
              key={timeSlot.start}
              start={timeSlot.start}
              end={timeSlot.end}
              isAvailable={false}
              availableCount={0}
              specialEvents={specialEvents}
            />
          );
        }
        
        // Para slots normales, calcular disponibilidad normal
        const bookingsCount = getBookingsCountForSlot(timeSlot.start);
        const availableSlots = totalCourts - bookingsCount;
        const isAvailable = !timeSlot.isPast && availableSlots > 0;
        const bookedUser = !isAvailable && !timeSlot.isPast ? getBookedUserForSlot(timeSlot.start) : undefined;
        
        return (
          <TimeSlot
            key={timeSlot.start}
            start={timeSlot.start}
            end={timeSlot.end}
            isAvailable={isAvailable}
            availableCount={availableSlots}
            specialEvents={specialEvents}
            bookedUser={bookedUser}
          />
        );
      })}
    </div>
  );
}
