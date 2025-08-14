
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format, addHours, isToday, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { Monitor, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllBookings } from "@/hooks/use-bookings";
import { useAvailableCourtTypes } from "@/hooks/use-available-court-types";
import { useCourtTypeSettings } from "@/hooks/use-court-type-settings";
import { Booking, SpecialBooking } from "@/types/booking";

// Generate time slots based on court type settings
function generateTimeSlots(settings: any, selectedDate: Date = new Date()) {
  const slots = [];
  const now = new Date();
  
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
    
    // Only check if it's in the past when it's TODAY
    const isPast = isToday(selectedDate) && isBefore(startTime, now);
    
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

  // Use the combined bookings hook with real-time updates already built-in
  const { data: allBookings = [], isLoading } = useAllBookings(currentDate);
  
  // Get active court types
  const { data: availableCourtTypes = [] } = useAvailableCourtTypes(true);
  
  // Get court type settings for generating time slots
  const { data: allCourtTypeSettingsData } = useCourtTypeSettings();
  const allCourtTypeSettings = Array.isArray(allCourtTypeSettingsData) ? allCourtTypeSettingsData : [];

  console.log("🖥️ Display component - All bookings received:", {
    total: allBookings.length,
    regular: allBookings.filter(b => !b.isSpecial).length,
    special: allBookings.filter(b => b.isSpecial).length,
    bookings: allBookings
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
    const found = allBookings.some(booking => {
      const bookingDate = new Date(booking.start_time);
      const bookingHour = format(bookingDate, "HH:00");
      const isMatch = booking.court_id === courtId && bookingHour === timeSlot;
      
      if (isMatch) {
        console.log(`🎯 Found booking for court ${courtId} at ${timeSlot}:`, {
          type: isSpecialBooking(booking) ? 'special' : 'regular',
          booking
        });
      }
      
      return isMatch;
    });
    
    return found;
  };

  // Get slot information
  const getSlotInfo = (courtId: string, timeSlot: string) => {
    const booking = allBookings.find(booking => {
      const bookingDate = new Date(booking.start_time);
      const bookingHour = format(bookingDate, "HH:00");
      return booking.court_id === courtId && bookingHour === timeSlot;
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
        isBooked: true
      };
    }

    return {
      type: 'available',
      booking: null,
      isBooked: false
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
      <div className="h-screen w-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm shadow-2xl border-b border-blue-200 flex-shrink-0">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-4">
              <img
                src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
                alt="CDV Logo"
                className="h-14 drop-shadow-lg"
              />
              <div className="hidden md:block h-12 w-px bg-gradient-to-b from-transparent via-blue-300 to-transparent"></div>
            </div>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
                {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
              </h1>
              <div className="flex items-center justify-center gap-3 bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-xl font-semibold text-blue-700">
                  {format(currentTime, "h:mm a")}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              {displaySettings?.enable_all_view && (
                <Button
                  variant={(viewMode as string) === 'all' ? 'default' : 'outline'}
                  onClick={() => setViewMode('all')}
                  className="px-6 py-3 text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Todas las Canchas
                </Button>
              )}
              {displaySettings?.enable_single_view && (
                <Button
                  variant={(viewMode as string) === 'single' ? 'default' : 'outline'}
                  onClick={() => setViewMode('single')}
                  className="px-6 py-3 text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  Vista Individual
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 flex justify-center gap-8 text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>{timeSlots.length * (courts?.length || 0) - allBookings.length} Disponibles</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span>{allBookings.filter(b => !b.isSpecial).length} Reservadas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
            <span>{allBookings.filter(b => b.isSpecial).length} Eventos</span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 p-6 min-h-0">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl h-full flex flex-col overflow-hidden border border-blue-100">
            {/* Courts Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white p-4 flex-shrink-0 rounded-t-xl">
              <div className="grid gap-3" style={{ gridTemplateColumns: `120px repeat(${courts?.length || 0}, 1fr)` }}>
                <div className="font-bold text-base text-center flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Horario
                </div>
                {courts?.map((court) => (
                  <div key={court.id} className="text-center font-bold text-sm bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                    <div className="truncate">{court.name}</div>
                    <div className="text-xs opacity-80 capitalize">{court.court_type}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Slots Grid */}
            <div className="flex-1 overflow-hidden p-2">
              <div className="h-full flex flex-col gap-1">
                {timeSlots.map((slot) => {
                  const isCurrent = format(currentTime, "HH:00") === slot;
                  return (
                    <div
                      key={slot}
                      className={`grid gap-3 px-4 py-3 rounded-lg transition-all duration-300 flex-1 min-h-0 ${
                        isCurrent 
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 shadow-lg transform scale-[1.02]' 
                          : 'hover:bg-gray-50/80 hover:shadow-md'
                      }`}
                      style={{ 
                        gridTemplateColumns: `120px repeat(${courts?.length || 0}, 1fr)`,
                        minHeight: '60px'
                      }}
                    >
                      <div className={`text-center font-bold text-base flex items-center justify-center rounded-lg ${
                        isCurrent 
                          ? 'bg-blue-500 text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {slot}
                      </div>
                      {courts?.map((court) => {
                        const slotInfo = getSlotInfo(court.id, slot);
                        return (
                          <div
                            key={`${court.id}-${slot}`}
                            className={`rounded-lg transition-all duration-300 m-1 flex flex-col items-center justify-center text-xs font-semibold shadow-md hover:shadow-lg transform hover:scale-105 ${
                              slotInfo.isBooked
                                ? slotInfo.type === 'special' 
                                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white border-2 border-purple-300' 
                                  : 'bg-gradient-to-br from-red-500 to-red-600 text-white border-2 border-red-300'
                                : 'bg-gradient-to-br from-green-100 to-green-200 text-green-800 border-2 border-green-300'
                            }`}
                            title={
                              slotInfo.type === 'special' && slotInfo.booking && isSpecialBooking(slotInfo.booking)
                                ? `${slotInfo.booking.title} - ${slotInfo.booking.event_type}`
                                : slotInfo.isBooked
                                ? 'Reservado'
                                : 'Disponible'
                            }
                          >
                            <div className="text-lg mb-1">
                              {slotInfo.isBooked ? (
                                slotInfo.type === 'special' ? '🎉' : '👤'
                              ) : (
                                '✅'
                              )}
                            </div>
                            <div className="text-[10px] text-center leading-tight">
                              {slotInfo.isBooked 
                                ? (slotInfo.type === 'special' ? 'Evento' : 'Reservado')
                                : 'Libre'
                              }
                            </div>
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
        <div className="bg-white/95 backdrop-blur-sm border-t border-blue-100 p-4 flex-shrink-0">
          <div className="flex justify-center gap-8">
            <div className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-full border border-green-200">
              <div className="w-5 h-5 bg-gradient-to-br from-green-100 to-green-200 rounded-full border-2 border-green-300 flex items-center justify-center">
                <span className="text-xs">✅</span>
              </div>
              <span className="text-gray-700 text-sm font-semibold">Disponible</span>
            </div>
            <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-full border border-red-200">
              <div className="w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 rounded-full border-2 border-red-300 flex items-center justify-center">
                <span className="text-xs text-white">👤</span>
              </div>
              <span className="text-gray-700 text-sm font-semibold">Reservado</span>
            </div>
            <div className="flex items-center gap-3 bg-purple-50 px-4 py-2 rounded-full border border-purple-200">
              <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full border-2 border-purple-300 flex items-center justify-center">
                <span className="text-xs text-white">🎉</span>
              </div>
              <span className="text-gray-700 text-sm font-semibold">Evento Especial</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Single Court View
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-2xl border-b border-blue-200 flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img
              src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
              alt="CDV Logo"
              className="h-12 drop-shadow-lg"
            />
            <div className="hidden md:block h-10 w-px bg-gradient-to-b from-transparent via-blue-300 to-transparent"></div>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-2">
              {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
            </h1>
            <div className="flex items-center justify-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-lg font-semibold text-blue-700">
                {format(currentTime, "h:mm a")}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            {displaySettings?.enable_all_view && (
              <Button
                variant={(viewMode as string) === 'all' ? 'default' : 'outline'}
                onClick={() => setViewMode('all')}
                className="px-4 py-2 text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Todas
              </Button>
            )}
            {displaySettings?.enable_single_view && (
              <Button
                variant={(viewMode as string) === 'single' ? 'default' : 'outline'}
                onClick={() => setViewMode('single')}
                className="px-4 py-2 text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Monitor className="w-4 h-4 mr-2" />
                Individual
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Court Selector */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b p-4 flex-shrink-0">
        <div className="flex justify-center">
          <div className="relative">
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="px-6 py-3 pr-12 border-0 rounded-xl text-lg font-semibold focus:outline-none focus:ring-4 focus:ring-blue-300 bg-white/95 backdrop-blur-sm shadow-lg min-w-[300px] appearance-none cursor-pointer"
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 12px center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '16px'
              }}
            >
              <option value="">📋 Seleccionar Cancha</option>
              {allCourts?.map((court) => (
                <option key={court.id} value={court.id}>
                  🏟️ {court.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Single Court Content */}
      {selectedCourt ? (
        <div className="flex-1 p-6 min-h-0">
          <div className="h-full bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl flex flex-col overflow-hidden border border-blue-100">
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white p-6 text-center flex-shrink-0 rounded-t-xl">
              <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">{selectedCourt.name}</h2>
              <div className="flex items-center justify-center gap-2 text-blue-100">
                <Clock className="w-5 h-5" />
                <p className="text-lg font-medium">Horarios del Día</p>
              </div>
            </div>

            <div className="flex-1 p-4 min-h-0">
              <div className="grid grid-rows-3 gap-4 h-full">
                {/* Morning, Afternoon, Evening rows */}
                 {(() => {
                   const totalSlots = timeSlots.length;
                   const slotsPerPeriod = Math.ceil(totalSlots / 3);
                   return [
                     { 
                       title: "🌅 Mañana", 
                       subtitle: `${timeSlots[0] || '08:00'} - ${timeSlots[slotsPerPeriod - 1] || '12:00'}`,
                       slots: timeSlots.slice(0, slotsPerPeriod),
                       color: 'from-yellow-400 to-orange-500'
                     },
                     { 
                       title: "☀️ Tarde", 
                       subtitle: `${timeSlots[slotsPerPeriod] || '13:00'} - ${timeSlots[slotsPerPeriod * 2 - 1] || '18:00'}`,
                       slots: timeSlots.slice(slotsPerPeriod, slotsPerPeriod * 2),
                       color: 'from-orange-500 to-red-500'
                     },
                     { 
                       title: "🌙 Noche", 
                       subtitle: `${timeSlots[slotsPerPeriod * 2] || '19:00'} - ${timeSlots[totalSlots - 1] || '23:00'}`,
                       slots: timeSlots.slice(slotsPerPeriod * 2),
                       color: 'from-blue-600 to-purple-600'
                     }
                   ];
                 })().map((period, periodIndex) => (
                  <div key={periodIndex} className="flex flex-col flex-1 bg-gray-50/50 rounded-xl p-4">
                    <div className={`bg-gradient-to-r ${period.color} text-white p-3 rounded-lg mb-3 text-center shadow-lg`}>
                      <h3 className="text-lg font-bold mb-1">{period.title}</h3>
                      <p className="text-sm opacity-90">{period.subtitle}</p>
                    </div>
                    <div className="flex-1 grid gap-3 min-h-0" style={{ gridTemplateColumns: `repeat(${Math.min(period.slots.length, 6)}, 1fr)` }}>
                      {period.slots.map((slot) => {
                        const slotInfo = getSlotInfo(selectedCourt.id, slot);
                        const isCurrent = format(currentTime, "HH:00") === slot;
                        
                        return (
                          <div
                            key={slot}
                            className={`border-2 rounded-xl p-3 text-center text-sm flex flex-col justify-center min-h-[100px] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                              isCurrent
                                ? 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-300 text-white ring-4 ring-blue-200 scale-110'
                                : slotInfo.isBooked
                                ? slotInfo.type === 'special'
                                  ? 'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-300 text-white'
                                  : 'bg-gradient-to-br from-red-400 to-red-600 border-red-300 text-white'
                                : 'bg-gradient-to-br from-green-100 to-green-200 border-green-300 text-green-800'
                            }`}
                          >
                            <div className="font-bold text-lg mb-2">{slot}</div>
                            <div className="text-2xl mb-2">
                              {isCurrent ? '⏰' : slotInfo.isBooked ? (
                                slotInfo.type === 'special' ? '🎉' : '👤'
                              ) : '✅'}
                            </div>
                            {slotInfo.isBooked ? (
                              <div className="space-y-1">
                                {slotInfo.type === 'special' && slotInfo.booking && isSpecialBooking(slotInfo.booking) ? (
                                  <>
                                    <div className="font-semibold text-xs leading-tight">{slotInfo.booking.title}</div>
                                    <div className="text-xs capitalize opacity-90">{slotInfo.booking.event_type}</div>
                                  </>
                                ) : (
                                  <div className="text-xs font-medium">Reservado</div>
                                )}
                              </div>
                            ) : isCurrent ? (
                              <div className="text-xs font-bold">Hora Actual</div>
                            ) : (
                              <div className="text-xs font-semibold">Disponible</div>
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
            <div className="bg-white/80 backdrop-blur-sm p-4 border-t border-blue-100 flex-shrink-0 rounded-b-xl">
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full border border-green-200">
                  <div className="w-4 h-4 bg-gradient-to-br from-green-100 to-green-200 rounded-full border border-green-300 flex items-center justify-center">
                    <span className="text-xs">✅</span>
                  </div>
                  <span className="text-gray-700 font-semibold">Disponible</span>
                </div>
                <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-full border border-red-200">
                  <div className="w-4 h-4 bg-gradient-to-br from-red-400 to-red-600 rounded-full border border-red-300 flex items-center justify-center">
                    <span className="text-xs text-white">👤</span>
                  </div>
                  <span className="text-gray-700 font-semibold">Reservado</span>
                </div>
                <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-full border border-purple-200">
                  <div className="w-4 h-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full border border-purple-300 flex items-center justify-center">
                    <span className="text-xs text-white">🎉</span>
                  </div>
                  <span className="text-gray-700 font-semibold">Evento Especial</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-full border border-blue-200">
                  <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border border-blue-300 flex items-center justify-center">
                    <span className="text-xs text-white">⏰</span>
                  </div>
                  <span className="text-gray-700 font-semibold">Hora Actual</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-500 bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-2xl border border-blue-100">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Monitor className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-3">Selecciona una Cancha</h3>
            <p className="text-lg text-gray-500">Elige una cancha del menú superior para ver sus horarios disponibles</p>
          </div>
        </div>
      )}
    </div>
  );
}
