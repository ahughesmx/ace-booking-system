
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Monitor, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllBookings } from "@/hooks/use-bookings";
import { Booking, SpecialBooking } from "@/types/booking";

// Generate time slots from 7:00 to 23:00
const timeSlots = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 7;
  return `${hour.toString().padStart(2, "0")}:00`;
});

export default function Display() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');

  const currentDate = new Date();
  console.log("🖥️ Display component initialized:", {
    currentDate: currentDate.toISOString(),
    viewMode
  });

  // Use the combined bookings hook
  const { data: allBookings = [], isLoading } = useAllBookings(currentDate);

  const { data: displaySettings } = useQuery({
    queryKey: ["display-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("display_settings")
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Error fetching display settings:", error);
        return { is_enabled: true, rotation_interval: 10000 };
      }

      return data || { is_enabled: true, rotation_interval: 10000 };
    },
  });

  const { data: courts } = useQuery({
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
      return data || [];
    },
  });

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

  // Type guard for special bookings
  const isSpecialBooking = (booking: Booking): booking is SpecialBooking => {
    return booking.isSpecial === true;
  };

  // Check if a slot is booked
  const isBooked = (courtId: string, timeSlot: string) => {
    return allBookings.some(booking => {
      const bookingHour = format(new Date(booking.start_time), "HH:00");
      return booking.court_id === courtId && bookingHour === timeSlot;
    });
  };

  // Get slot information
  const getSlotInfo = (courtId: string, timeSlot: string) => {
    const booking = allBookings.find(booking => {
      const bookingHour = format(new Date(booking.start_time), "HH:00");
      return booking.court_id === courtId && bookingHour === timeSlot;
    });

    if (booking) {
      return {
        type: isSpecialBooking(booking) ? 'special' as const : 'regular' as const,
        booking: booking,
        isBooked: true
      };
    }

    return {
      type: 'available' as const,
      booking: null,
      isBooked: false
    };
  };

  const selectedCourt = courts?.find(court => court.id === selectedCourtId);

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
                {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
              </h1>
              <p className="text-lg text-blue-600 font-semibold flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {format(currentTime, "h:mm a")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={() => setViewMode('all')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
              >
                <Building2 className="w-4 h-4 mr-1" />
                Todas
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewMode('single')}
                className="border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 text-sm"
              >
                <Monitor className="w-4 h-4 mr-1" />
                Individual
              </Button>
            </div>
          </div>
        </div>

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
                            className={`rounded transition-all m-1 ${
                              slotInfo.isBooked
                                ? slotInfo.type === 'special' 
                                  ? 'bg-purple-500' 
                                  : 'bg-red-500'
                                : 'bg-green-100'
                            }`}
                            title={
                              slotInfo.type === 'special' && slotInfo.booking && isSpecialBooking(slotInfo.booking)
                                ? `${slotInfo.booking.title} - ${slotInfo.booking.event_type}`
                                : slotInfo.isBooked
                                ? 'Reservado'
                                : 'Disponible'
                            }
                          />
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
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span className="text-gray-700 text-sm font-medium">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-700 text-sm font-medium">Reservado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-gray-700 text-sm font-medium">Evento Especial</span>
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
            className="h-8"
          />
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-800">
              {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
            </h1>
            <p className="text-sm text-blue-600 font-semibold flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              {format(currentTime, "h:mm a")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode('all')}
              className="border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1 text-xs"
            >
              <Building2 className="w-3 h-3 mr-1" />
              Todas
            </Button>
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
            >
              <Monitor className="w-3 h-3 mr-1" />
              Individual
            </Button>
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
            {courts?.map((court) => (
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
              <div className="grid grid-cols-3 gap-2 h-full">
                {/* Morning, Afternoon, Evening columns */}
                {[
                  { title: "Mañana (7:00 - 12:00)", slots: timeSlots.slice(0, 6) },
                  { title: "Tarde (13:00 - 18:00)", slots: timeSlots.slice(6, 12) },
                  { title: "Noche (19:00 - 23:00)", slots: timeSlots.slice(12) }
                ].map((period, periodIndex) => (
                  <div key={periodIndex} className="flex flex-col">
                    <h3 className="text-xs font-bold text-gray-800 mb-1 text-center border-b border-gray-200 pb-1 flex-shrink-0">
                      {period.title}
                    </h3>
                    <div className={`flex-1 grid gap-1 min-h-0`} style={{ gridTemplateRows: `repeat(${period.slots.length}, 1fr)` }}>
                      {period.slots.map((slot) => {
                        const slotInfo = getSlotInfo(selectedCourt.id, slot);
                        const isCurrent = format(currentTime, "HH:00") === slot;
                        
                        return (
                          <div
                            key={slot}
                            className={`border rounded p-1 text-center text-xs flex flex-col justify-center ${
                              slotInfo.isBooked
                                ? slotInfo.type === 'special'
                                  ? 'bg-purple-100 border-purple-300 text-purple-800'
                                  : 'bg-red-100 border-red-300 text-red-800'
                                : isCurrent
                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                : 'bg-green-50 border-green-200 text-green-800'
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
                                  <div className="text-xs">Reservado</div>
                                )}
                              </div>
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
                  <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
                  <span className="text-gray-700 font-medium">Disponible</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                  <span className="text-gray-700 font-medium">Reservado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
                  <span className="text-gray-700 font-medium">Evento Especial</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
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
