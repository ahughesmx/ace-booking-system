
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format, addHours, isToday, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { formatShortDate } from "@/lib/date-utils";
import { Monitor, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllBookings } from "@/hooks/use-bookings";
import { useAvailableCourtTypes } from "@/hooks/use-available-court-types";
import { useCourtTypeSettings } from "@/hooks/use-court-type-settings";
import { Booking, SpecialBooking } from "@/types/booking";
import { getCurrentMexicoCityTime, toMexicoCityTime } from "@/utils/timezone";

// Generate time slots based on court type settings
function generateTimeSlots(settings: any, selectedDate: Date = new Date()) {
  const slots = [];
  const now = getCurrentMexicoCityTime();
  
  if (!settings) return [];

  // Convert configuration hours to numbers
  const startHour = parseInt(settings.operating_hours_start.split(':')[0]);
  const endHour = parseInt(settings.operating_hours_end.split(':')[0]);
  
  // Check operating days
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[selectedDate.getDay()];
  
  if (!settings.operating_days.includes(dayOfWeek)) {
    return []; // No slots if not operating this day
  }
  
  for (let hour = startHour; hour < endHour; hour++) {
    const startTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour);
    const endTime = addHours(startTime, 1);
    
    // Only mark as past if current time is >= slot end time
    const isPast = isToday(selectedDate) && now >= endTime;
    
    slots.push({
      start: format(startTime, "HH:00"),
      end: format(endTime, "HH:00"),
      isPast
    });
  }
  return slots;
}

export default function Display() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'all' | 'single'>('single'); // Default to single
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');

  const currentDate = new Date();
  console.log("🖥️ Display component - Current date:", currentDate.toISOString());

  // Use the combined bookings hook with public view for unauthenticated display access
  const { data: allBookings = [], isLoading } = useAllBookings(currentDate, true);
  
  // Get active court types
  const { data: availableCourtTypes = [] } = useAvailableCourtTypes(true);
  
  // Get court type settings for generating time slots
  const { data: allCourtTypeSettingsData } = useCourtTypeSettings();
  const allCourtTypeSettings = Array.isArray(allCourtTypeSettingsData) ? allCourtTypeSettingsData : [];

  console.log("🖥️ Display component - Data loaded:", {
    bookings: allBookings.length,
    regular: allBookings.filter(b => !b.isSpecial).length,
    special: allBookings.filter(b => b.isSpecial).length,
    availableCourtTypes: availableCourtTypes.length,
    courtTypeSettings: allCourtTypeSettings.length,
    isLoading
  });


  const { data: displaySettings } = useQuery({
    queryKey: ["display-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("display_settings")
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Error fetching display settings:", error);
        return { is_enabled: true, rotation_interval: 10000, enable_all_view: true, enable_single_view: true, default_view: 'single' };
      }

      return data || { is_enabled: true, rotation_interval: 10000, enable_all_view: true, enable_single_view: true, default_view: 'single' };
    },
  });

  // Set initial view mode based on display settings
  useEffect(() => {
    if (displaySettings?.default_view && displaySettings.default_view !== viewMode) {
      setViewMode(displaySettings.default_view as 'all' | 'single');
    }
  }, [displaySettings?.default_view, viewMode]);

  const { data: allCourts } = useQuery({
    queryKey: ["courts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching courts:", error);
        return [];
      }
      console.log("🏟️ Courts fetched:", data?.length || 0, data);
      return data || [];
    },
  });

  // Set default court to Pádel in individual view
  useEffect(() => {
    if (viewMode === 'single' && !selectedCourtId && allCourts?.length) {
      const padelCourt = allCourts.find(court => court.court_type === 'padel');
      if (padelCourt) {
        setSelectedCourtId(padelCourt.id);
      }
    }
  }, [viewMode, selectedCourtId, allCourts]);

  // Filter courts by active sport types for "All" view
  const courts = viewMode === 'all' 
    ? allCourts?.filter(court => 
        availableCourtTypes.some(type => type.type_name === court.court_type)
      ) || []
    : allCourts || [];

  console.log("🏟️ Filtered courts for display:", {
    viewMode,
    totalCourts: allCourts?.length || 0,
    filteredCourts: courts?.length || 0,
    availableCourtTypes: availableCourtTypes.map(t => t.type_name)
  });

  // Generate unified time slots based on all court type settings
  const timeSlots = (() => {
    if (!allCourtTypeSettings.length) return [];
    
    // Get the most inclusive operating hours from all court types
    let earliestStart = 24;
    let latestEnd = 0;
    let allOperatingDays = new Set<string>();
    
    allCourtTypeSettings.forEach(settings => {
      const startHour = parseInt(settings.operating_hours_start.split(':')[0]);
      const endHour = parseInt(settings.operating_hours_end.split(':')[0]);
      earliestStart = Math.min(earliestStart, startHour);
      latestEnd = Math.max(latestEnd, endHour);
      settings.operating_days.forEach(day => allOperatingDays.add(day));
    });
    
    // Create a unified settings object
    const unifiedSettings = {
      operating_hours_start: `${earliestStart.toString().padStart(2, '0')}:00`,
      operating_hours_end: `${latestEnd.toString().padStart(2, '0')}:00`,
      operating_days: Array.from(allOperatingDays)
    };
    
    const slots = generateTimeSlots(unifiedSettings, currentDate);
    console.log("🖥️ Generated time slots:", slots);
    return slots.map(slot => slot.start);
  })();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    const wakeLock = async () => {
      try {
        await navigator.wakeLock.request("screen");
      } catch (err) {
        console.log(`${err.name}, ${err.message}`);
      }
    };
    wakeLock();

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh for individual view
  useEffect(() => {
    if (viewMode === 'single' && displaySettings?.rotation_interval) {
      const refreshInterval = setInterval(() => {
        setCurrentTime(new Date());
      }, displaySettings.rotation_interval);

      return () => clearInterval(refreshInterval);
    }
  }, [viewMode, displaySettings?.rotation_interval]);

  if (!displaySettings?.is_enabled) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <img
          src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
          alt="CDV Logo"
          className="max-w-[200px]"
        />
      </div>
    );
  }

  // Check if both views are disabled
  if (!displaySettings?.enable_all_view && !displaySettings?.enable_single_view) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <img
            src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
            alt="CDV Logo"
            className="max-w-[200px] mb-4"
          />
          <p className="text-gray-600">No hay vistas habilitadas</p>
        </div>
      </div>
    );
  }

  // Type guard for special bookings
  const isSpecialBooking = (booking: Booking): booking is SpecialBooking => {
    return booking.isSpecial === true;
  };

  // Check if a slot is booked
  const isBooked = (courtId: string, timeSlot: string) => {
    const slotHour = parseInt(timeSlot.split(':')[0]);
    const slotStart = new Date(currentDate);
    slotStart.setHours(slotHour, 0, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotHour + 1, 0, 0, 0);

    const found = allBookings.some(booking => {
      if (booking.court_id !== courtId) return false;

      const bookingStart = toMexicoCityTime(booking.start_time);
      const bookingEnd = toMexicoCityTime(booking.end_time);

      // Check if slot overlaps with booking
      const isOverlapping = slotStart < bookingEnd && slotEnd > bookingStart;
      
      if (isOverlapping) {
        console.log(`🎯 Slot ${timeSlot} occupied by booking:`, {
          type: isSpecialBooking(booking) ? 'special' : 'regular',
          range: `${format(bookingStart, 'HH:mm')} - ${format(bookingEnd, 'HH:mm')}`,
          slot: `${timeSlot} - ${format(slotEnd, 'HH:mm')}`
        });
      }
      
      return isOverlapping;
    });
    
    return found;
  };

  // Get slot information
  const getSlotInfo = (courtId: string, timeSlot: string) => {
    // Use Mexico City time
    const now = getCurrentMexicoCityTime();
    const slotTime = new Date(currentDate);
    const [hour] = timeSlot.split(':');
    slotTime.setHours(parseInt(hour), 0, 0, 0);
    
    // Create slot end time (1 hour later)
    const slotEndTime = new Date(slotTime);
    slotEndTime.setHours(slotEndTime.getHours() + 1);
    
    // A slot is "past" only if current time >= end time
    const isPast = isToday(currentDate) && now >= slotEndTime;
    
    // A slot is "current" if now is between start and end
    const isCurrent = isToday(currentDate) && now >= slotTime && now < slotEndTime;

    const booking = allBookings.find(booking => {
      if (booking.court_id !== courtId) return false;

      const bookingStart = toMexicoCityTime(booking.start_time);
      const bookingEnd = toMexicoCityTime(booking.end_time);

      // Check if slot overlaps with booking
      const isOverlapping = slotTime < bookingEnd && slotEndTime > bookingStart;
      
      return isOverlapping;
    });

    if (booking) {
      const type = isSpecialBooking(booking) ? 'special' : 'regular';
      console.log(`📍 Slot info for court ${courtId} at ${timeSlot}:`, {
        type,
        booking,
        title: isSpecialBooking(booking) ? booking.title : 'Reserva regular'
      });
      
      return {
        type,
        booking: booking,
        isBooked: true,
        isPast,
        isCurrent
      };
    }

    return {
      type: isPast ? 'past' : 'available',
      booking: null,
      isBooked: false,
      isPast,
      isCurrent
    };
  };

  const selectedCourt = courts?.find(court => court.id === selectedCourtId);

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg text-gray-600">Cargando reservas...</p>
        </div>
      </div>
    );
  }

  // Debug info in development
  if (process.env.NODE_ENV === 'development') {
    console.log("🔍 Debug info:", {
      allBookings: allBookings.length,
      regularBookings: allBookings.filter(b => !b.isSpecial).length,
      specialBookings: allBookings.filter(b => b.isSpecial).length,
      courts: courts?.length || 0,
      currentDate: currentDate.toISOString(),
      timeSlots: timeSlots.length
    });
  }

  // Render All Courts View
  if (viewMode === 'all') {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-lg border-b-4 border-blue-500 flex-shrink-0">
          <div className="flex items-center justify-between px-6 py-3">
            <img
              src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
              alt="CDV Logo"
              className="h-12"
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-1">
                {formatShortDate(getCurrentMexicoCityTime())}
              </h1>
              <p className="text-lg text-blue-600 font-semibold flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {format(getCurrentMexicoCityTime(), "h:mm a")}
              </p>
            </div>
            <div className="flex gap-2">
              {displaySettings?.enable_all_view && (
                <Button
                  variant={(viewMode as string) === 'all' ? 'default' : 'outline'}
                  onClick={() => setViewMode('all')}
                  className="px-4 py-2 text-sm"
                >
                  <Building2 className="w-4 h-4 mr-1" />
                  Todas
                </Button>
              )}
              {displaySettings?.enable_single_view && (
                <Button
                  variant={(viewMode as string) === 'single' ? 'default' : 'outline'}
                  onClick={() => setViewMode('single')}
                  className="px-4 py-2 text-sm"
                >
                  <Monitor className="w-4 h-4 mr-1" />
                  Individual
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Debug info - only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-100 p-2 text-xs text-center">
            Reservas: {allBookings.filter(b => !b.isSpecial).length} regulares, {allBookings.filter(b => b.isSpecial).length} especiales | 
            Canchas: {courts?.length || 0} | 
            Fecha: {format(currentDate, "yyyy-MM-dd")} |
            TimeSlots: {timeSlots.length} |
            AvailableCourtTypes: {availableCourtTypes.length} |
            DisplayEnabled: {displaySettings?.is_enabled ? 'Yes' : 'No'}
          </div>
        )}

        {/* Main Grid */}
        <div className="flex-1 p-4 min-h-0">
          <div className="bg-white rounded-lg shadow-xl h-full flex flex-col overflow-hidden">
            {/* Courts Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 flex-shrink-0">
              <div className="grid gap-2" style={{ gridTemplateColumns: `100px repeat(${courts?.length || 0}, 1fr)` }}>
                <div className="font-bold text-sm text-center">Hora</div>
                {courts?.map((court) => (
                  <div key={court.id} className="text-center font-bold text-sm truncate">
                    {court.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Time Slots Grid */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                {timeSlots.map((slot) => {
                  const isCurrent = format(currentTime, "HH:00") === slot;
                  return (
                    <div
                      key={slot}
                      className={`grid gap-2 px-3 border-b border-gray-100 transition-colors flex-1 min-h-0 ${
                        isCurrent ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                      }`}
                      style={{ 
                        gridTemplateColumns: `100px repeat(${courts?.length || 0}, 1fr)`,
                        height: `${100 / timeSlots.length}%`
                      }}
                    >
                      <div className={`text-center font-semibold text-sm flex items-center justify-center ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}>
                        {slot}
                      </div>
                      {courts?.map((court) => {
                        const slotInfo = getSlotInfo(court.id, slot);
                        return (
                          <div
                            key={`${court.id}-${slot}`}
                            className={`rounded transition-all m-1 flex items-center justify-center text-xs text-white font-medium ${
                              slotInfo.isBooked
                                ? slotInfo.type === 'special' 
                                  ? 'bg-yellow-600 hover:bg-yellow-700' 
                                  : 'bg-red-500 hover:bg-red-600'
                                : slotInfo.type === 'past'
                                ? 'bg-gray-400 text-gray-600'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                            title={
                              slotInfo.type === 'special' && slotInfo.booking && isSpecialBooking(slotInfo.booking)
                                ? `${slotInfo.booking.title} - ${slotInfo.booking.event_type}`
                                : slotInfo.isBooked && slotInfo.booking && slotInfo.booking.user
                                ? `Reservado - ${slotInfo.booking.user.full_name}`
                                : slotInfo.isBooked
                                ? 'Reservado'
                                : slotInfo.type === 'past'
                                ? 'Horario pasado'
                                : 'Disponible'
                            }
                          >
                            {slotInfo.isBooked ? (
                              slotInfo.type === 'special' ? '🎉' : '👤'
                            ) : slotInfo.type === 'past' ? (
                              '⏰'
                            ) : (
                              '✓'
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white border-t p-2 flex-shrink-0">
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-gray-700 text-sm font-medium">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-700 text-sm font-medium">Reservado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-600 rounded"></div>
              <span className="text-gray-700 text-sm font-medium">Evento Especial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span className="text-gray-700 text-sm font-medium">Horario pasado</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Single Court View
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-blue-500 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-2">
          <img
            src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
            alt="CDV Logo"
            className="h-10"
          />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">
              {formatShortDate(getCurrentMexicoCityTime())} - {format(getCurrentMexicoCityTime(), "h:mm a")}
            </h1>
          </div>
          <div className="flex gap-2">
            {displaySettings?.enable_all_view && (
              <Button
                variant={(viewMode as string) === 'all' ? 'default' : 'outline'}
                onClick={() => setViewMode('all')}
                className="px-3 py-1 text-xs"
              >
                <Building2 className="w-3 h-3 mr-1" />
                Todas
              </Button>
            )}
            {displaySettings?.enable_single_view && (
              <Button
                variant={(viewMode as string) === 'single' ? 'default' : 'outline'}
                onClick={() => setViewMode('single')}
                className="px-3 py-1 text-xs"
              >
                <Monitor className="w-3 h-3 mr-1" />
                Individual
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Court Selector */}
      <div className="bg-white border-b p-2 flex-shrink-0">
        <div className="flex justify-center">
          <select
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
            className="px-3 py-1 border-2 border-blue-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[200px]"
          >
            <option value="">Seleccionar Cancha</option>
            {allCourts?.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Single Court Content */}
      {selectedCourt ? (
        <div className="flex-1 p-2 min-h-0">
          <div className="h-full bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 text-center flex-shrink-0">
              <h2 className="text-lg font-bold">{selectedCourt.name}</h2>
              <p className="text-xs opacity-90">Horarios del Día</p>
            </div>

            <div className="flex-1 p-2 min-h-0">
              <div className="grid grid-rows-3 gap-3 h-full">
                {/* Morning, Afternoon, Evening rows */}
                 {(() => {
                   const totalSlots = timeSlots.length;
                   const slotsPerPeriod = Math.ceil(totalSlots / 3);
                   return [
                     { 
                       title: `Mañana (${timeSlots[0] || '08:00'} - ${timeSlots[slotsPerPeriod - 1] || '12:00'})`, 
                       slots: timeSlots.slice(0, slotsPerPeriod) 
                     },
                     { 
                       title: `Tarde (${timeSlots[slotsPerPeriod] || '13:00'} - ${timeSlots[slotsPerPeriod * 2 - 1] || '18:00'})`, 
                       slots: timeSlots.slice(slotsPerPeriod, slotsPerPeriod * 2) 
                     },
                     { 
                       title: `Noche (${timeSlots[slotsPerPeriod * 2] || '19:00'} - ${timeSlots[totalSlots - 1] || '23:00'})`, 
                       slots: timeSlots.slice(slotsPerPeriod * 2) 
                     }
                   ];
                 })().map((period, periodIndex) => (
                  <div key={periodIndex} className="flex flex-col flex-1">
                    <h3 className="text-sm font-bold text-gray-800 mb-2 text-center border-b border-gray-200 pb-1 flex-shrink-0">
                      {period.title}
                    </h3>
                    <div className="flex-1 grid gap-2 min-h-0" style={{ gridTemplateColumns: `repeat(${period.slots.length}, 1fr)` }}>
                      {period.slots.map((slot) => {
                        const slotInfo = getSlotInfo(selectedCourt.id, slot);
                        const isCurrent = format(currentTime, "HH:00") === slot;
                        
                        return (
                          <div
                            key={slot}
                            className={`border rounded p-2 text-center text-xs flex flex-col justify-center min-h-[80px] ${
                              slotInfo.isBooked
                                ? slotInfo.type === 'special'
                                  ? 'bg-yellow-100 border-yellow-400 text-yellow-900'
                                  : 'bg-red-100 border-red-300 text-red-800'
                                : slotInfo.type === 'past'
                                ? 'bg-gray-100 border-gray-300 text-gray-600'
                                : isCurrent
                                ? 'bg-blue-200 border-blue-400 text-blue-900'
                                : 'bg-blue-600 border-blue-700 text-white'
                            }`}
                          >
                            <div className="font-bold text-sm mb-1">{slot}</div>
                             {slotInfo.isBooked ? (
                               <div className="space-y-1">
                                 {slotInfo.type === 'special' && slotInfo.booking && isSpecialBooking(slotInfo.booking) ? (
                                   <>
                                     <div className="font-medium text-xs truncate">{slotInfo.booking.title}</div>
                                     <div className="text-xs capitalize truncate">{slotInfo.booking.event_type}</div>
                                   </>
                                 ) : (
                                   <>
                                     <div className="text-xs font-medium">Reservado</div>
                                     {slotInfo.booking && slotInfo.booking.user && (
                                       <div className="text-xs text-gray-600 truncate">{slotInfo.booking.user.full_name}</div>
                                     )}
                                   </>
                                 )}
                               </div>
                             ) : slotInfo.type === 'past' ? (
                               <div className="text-xs font-medium">Horario pasado</div>
                             ) : (
                              <div className="text-xs font-medium">Disponible</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-gray-50 p-2 border-t flex-shrink-0">
              <div className="flex justify-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-600 border border-blue-700 rounded"></div>
                  <span className="text-gray-700 font-medium">Disponible</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                  <span className="text-gray-700 font-medium">Reservado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                  <span className="text-gray-700 font-medium">Evento Especial</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                  <span className="text-gray-700 font-medium">Horario pasado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-200 border border-blue-400 rounded"></div>
                  <span className="text-gray-700 font-medium">Hora Actual</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">Selecciona una cancha para ver sus horarios</p>
          </div>
        </div>
      )}
    </div>
  );
}
