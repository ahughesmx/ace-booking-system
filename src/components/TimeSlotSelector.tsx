
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, addHours, isBefore, isToday } from "date-fns";
import { useCourts } from "@/hooks/use-courts";
import { useCourtTypeSettings } from "@/hooks/use-court-type-settings";
import { useActiveMaintenancePeriods } from "@/hooks/use-court-maintenance";

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
  const { data: courts = [], isLoading: courtsLoading } = useCourts(courtType);
  const { data: settingsData, isLoading: settingsLoading } = useCourtTypeSettings(courtType);
  const { data: maintenanceCourts = new Set() } = useActiveMaintenancePeriods();
  
  // Ensure we get the correct type - when courtType is provided, we get a single object
  const settings = courtType && settingsData && !Array.isArray(settingsData) ? settingsData : null;
  
  // Si tenemos courtType pero estamos cargando settings, mostrar loading
  const isLoadingCriticalData = courtType && (courtsLoading || settingsLoading);
  
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
  console.log('TimeSlotSelector - isLoadingCriticalData:', isLoadingCriticalData);

  // Mostrar loading si estamos esperando datos críticos
  if (isLoadingCriticalData) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h4 className="text-lg font-semibold text-[#1e3a8a] mb-2">
            Cargando horarios para {courtType}...
          </h4>
          <div className="bg-[#6898FE]/5 border border-[#6898FE]/20 rounded-lg p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-[#6898FE]/20 rounded mb-2"></div>
              <div className="h-4 bg-[#6898FE]/20 rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getAvailableSlots = (slot: string) => {
    if (totalCourts === 0) return 0;
    
    // Contar cuántas reservas hay para este horario específico del tipo de cancha seleccionado
    const bookingsCount = bookedSlots.has(slot) ? 1 : 0;
    const available = Math.max(0, totalCourts - bookingsCount);
    
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
            {settings.price_per_hour && ` | $${settings.price_per_hour}/hora`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {timeSlots.map(timeSlot => {
          const availableSlots = getAvailableSlots(timeSlot.start);
          const isAvailable = !timeSlot.isPast && availableSlots > 0;
          const isSelected = selectedTime === timeSlot.start;
          
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
            {settings?.price_per_hour && (
              <span className="ml-2 text-xs">
                (${settings.price_per_hour}/hora)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
