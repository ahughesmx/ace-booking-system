
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, addHours, isBefore, isToday } from "date-fns";
import { useCourts } from "@/hooks/use-courts";
import { useCourtTypeSettings } from "@/hooks/use-court-type-settings";
import { useActiveMaintenancePeriods } from "@/hooks/use-court-maintenance";
import { useAllBookings } from "@/hooks/use-bookings";
import { SpecialBooking } from "@/types/booking";

interface TimeSlotSelectorProps {
  selectedDate?: Date;
  courtType?: string | null;
  bookedSlots: Set<string>;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  businessHours: {
    start: number;
    end: number;
  };
  isOperator?: boolean; // Nuevo prop para identificar operadores
}

function generateTimeSlots(settings: any, selectedDate: Date = new Date()) {
  const slots = [];
  const now = new Date();
  
  if (!settings) return slots;

  // Convertir horas de configuración a números
  const startHour = parseInt(settings.operating_hours_start.split(':')[0]);
  const endHour = parseInt(settings.operating_hours_end.split(':')[0]);
  
  // Verificar días de operación
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[selectedDate.getDay()];
  
  if (!settings.operating_days.includes(dayOfWeek)) {
    return []; // No generar slots si no opera este día
  }
  
  for (let hour = startHour; hour < endHour; hour++) {
    const startTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour);
    const endTime = addHours(startTime, 1);
    
    // ARREGLO: Solo verificar si está en el pasado cuando es HOY
    const isPast = isToday(selectedDate) && isBefore(startTime, now);
    
    console.log(`⏰ SLOT ${hour}:00 - isToday: ${isToday(selectedDate)}, startTime: ${startTime.toLocaleTimeString()}, now: ${now.toLocaleTimeString()}, isPast: ${isPast}`);
    
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
  businessHours,
  isOperator = false 
}: TimeSlotSelectorProps) {
  const { data: courts = [] } = useCourts(courtType);
  const { data: settingsData } = useCourtTypeSettings(courtType);
  const { data: maintenanceCourts = new Set() } = useActiveMaintenancePeriods();
  const { data: allBookings = [] } = useAllBookings(selectedDate);
  
  // Ensure we get the correct type - when courtType is provided, we get a single object
  const settings = courtType && settingsData && !Array.isArray(settingsData) ? settingsData : null;
  
  // Filtrar canchas que no están en mantenimiento
  const availableCourts = courts.filter(court => !maintenanceCourts.has(court.id));
  const totalCourts = availableCourts.length;
  
  // Usar las configuraciones específicas del tipo de cancha si están disponibles
  const timeSlots = settings 
    ? generateTimeSlots(settings, selectedDate) 
    : generateTimeSlots({ 
        operating_hours_start: `${businessHours.start}:00:00`, 
        operating_hours_end: `${businessHours.end}:00:00`,
        operating_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }, selectedDate);

  console.log('TimeSlotSelector - courtType:', courtType);
  console.log('TimeSlotSelector - settings:', settings);
  console.log('TimeSlotSelector - timeSlots generated:', timeSlots.length);
  console.log('TimeSlotSelector - courts in maintenance:', maintenanceCourts.size);
  console.log('TimeSlotSelector - available courts:', totalCourts);

  // Función para verificar si hay eventos especiales en un slot
  const getSpecialEventsForSlot = (slot: string) => {
    return allBookings.filter(booking => {
      const bookingHour = format(new Date(booking.start_time), "HH:00");
      const bookingCourtType = booking.court?.court_type;
      
      // Solo verificar eventos especiales del tipo de cancha seleccionado
      if (courtType && bookingCourtType !== courtType) {
        return false;
      }
      
      return bookingHour === slot && booking.isSpecial;
    }) as SpecialBooking[];
  };

  const getAvailableSlots = (slot: string) => {
    if (totalCourts === 0) return 0;
    
    // Contar cuántas reservas hay para este horario específico del tipo de cancha seleccionado
    const bookingsCount = bookedSlots.has(slot) ? 1 : 0;
    const available = Math.max(0, totalCourts - bookingsCount);
    
    console.log(`🔍 DISPONIBILIDAD SLOT ${slot}: totalCourts=${totalCourts}, bookingsCount=${bookingsCount}, available=${available}, bookedSlots.has=${bookedSlots.has(slot)}`);
    
    return available;
  };

  if (totalCourts === 0) {
    const hasMaintenanceCourts = courts.length > availableCourts.length;
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h4 className="text-lg font-semibold text-[#1e3a8a] mb-2">
            Selecciona tu horario para {courtType}
          </h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">
              {hasMaintenanceCourts 
                ? `Todas las canchas de ${courtType} están temporalmente fuera de servicio`
                : `No hay canchas de ${courtType} disponibles en el sistema`
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Verificar si no hay slots disponibles por día no operativo
  if (timeSlots.length === 0) {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = dayNames[selectedDate?.getDay() || 0];
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h4 className="text-lg font-semibold text-[#1e3a8a] mb-2">
            Selecciona tu horario para {courtType}
          </h4>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-600">
              Las canchas de {courtType} no operan los {dayName}s
            </p>
            {settings && (
              <p className="text-xs text-yellow-500 mt-1">
                Días de operación: {settings.operating_days.map((day: string) => {
                  const dayMap: { [key: string]: string } = {
                    'monday': 'Lun', 'tuesday': 'Mar', 'wednesday': 'Mié', 
                    'thursday': 'Jue', 'friday': 'Vie', 'saturday': 'Sáb', 'sunday': 'Dom'
                  };
                  return dayMap[day];
                }).join(', ')}
              </p>
            )}
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
          {courts.length > totalCourts && (
            <span className="text-orange-600 ml-1">
              ({courts.length - totalCourts} en mantenimiento)
            </span>
          )}
        </p>
        {settings && (
          <p className="text-xs text-muted-foreground mt-1">
            Horarios: {settings.operating_hours_start.slice(0, 5)} - {settings.operating_hours_end.slice(0, 5)} 
            {(() => {
              const displayPrice = isOperator && settings.operador_price_per_hour 
                ? settings.operador_price_per_hour 
                : settings.price_per_hour;
              const priceLabel = isOperator && settings.operador_price_per_hour ? ' (Operador)' : '';
              return displayPrice ? ` | $${displayPrice}/hora${priceLabel}` : '';
            })()}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {timeSlots.map(timeSlot => {
          const availableSlots = getAvailableSlots(timeSlot.start);
          const isAvailable = !timeSlot.isPast && availableSlots > 0;
          const isSelected = selectedTime === timeSlot.start;
          const specialEvents = getSpecialEventsForSlot(timeSlot.start);
          const hasSpecialEvents = specialEvents.length > 0;
          
          console.log(`🔍 SLOT DEBUG - ${timeSlot.start}: isPast=${timeSlot.isPast}, availableSlots=${availableSlots}, isAvailable=${isAvailable}, hasSpecialEvents=${hasSpecialEvents}`);
          
          return (
            <Button
              key={timeSlot.start}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "h-auto p-3 flex flex-col items-center justify-center space-y-1 transition-all relative",
                hasSpecialEvents
                  ? "bg-purple-50 border-purple-200 hover:bg-purple-100"
                  : isAvailable 
                    ? "hover:bg-[#6898FE]/10 hover:border-[#6898FE] border-[#6898FE]/20" 
                    : "opacity-50 cursor-not-allowed bg-gray-50",
                isSelected && !hasSpecialEvents && "bg-[#6898FE] text-white border-[#6898FE]",
                isSelected && hasSpecialEvents && "bg-purple-600 text-white border-purple-600"
              )}
              disabled={!isAvailable}
              onClick={() => {
                console.log(`🎯 CLICK EN SLOT ${timeSlot.start} - isAvailable: ${isAvailable}, disabled: ${!isAvailable}`);
                if (isAvailable) {
                  console.log(`✅ SELECCIONANDO HORARIO: ${timeSlot.start}`);
                  onTimeSelect(timeSlot.start);
                } else {
                  console.log(`❌ SLOT NO DISPONIBLE: ${timeSlot.start}`);
                }
              }}
            >
              {hasSpecialEvents && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">!</span>
                </div>
              )}
              
              <span className="font-medium text-sm">
                {timeSlot.start} - {timeSlot.end}
              </span>
              
              {hasSpecialEvents ? (
                <div className="space-y-0.5 text-center">
                  <span className="text-xs text-purple-600 font-medium block">
                    🎯 {specialEvents[0].event_type}
                  </span>
                  <span className="text-xs text-purple-500 block truncate max-w-full">
                    {specialEvents[0].title}
                  </span>
                </div>
              ) : (
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
              )}
            </Button>
          );
        })}
      </div>

      {selectedTime && (
        <div className="bg-[#6898FE]/10 border border-[#6898FE]/20 rounded-lg p-3 text-center">
          <p className="text-sm text-[#1e3a8a]">
            ✓ Horario seleccionado: <span className="font-semibold">{selectedTime}</span>
            {settings && (() => {
              const displayPrice = isOperator && settings.operador_price_per_hour 
                ? settings.operador_price_per_hour 
                : settings.price_per_hour;
              const priceLabel = isOperator && settings.operador_price_per_hour ? ' (Operador)' : '';
              return displayPrice ? (
                <span className="ml-2 text-xs">
                  (${displayPrice}/hora{priceLabel})
                </span>
              ) : null;
            })()}
          </p>
        </div>
      )}
    </div>
  );
}
