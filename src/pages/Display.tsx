
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Monitor, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Generate time slots from 7:00 to 23:00
const timeSlots = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 7;
  return `${hour.toString().padStart(2, "0")}:00`;
});

export default function Display() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');

  const { data: displaySettings } = useQuery({
    queryKey: ["display-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("display_settings")
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Error fetching display settings:", error);
        throw error;
      }

      return data || {
        is_enabled: true,
        rotation_interval: 10000,
      };
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["display-bookings"],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("bookings")
        .select("*, court:courts(*)")
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: courts } = useQuery({
    queryKey: ["courts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
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
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <img
          src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
          alt="CDV Logo"
          className="max-w-[200px]"
        />
      </div>
    );
  }

  const isBooked = (courtId: string, timeSlot: string) => {
    return bookings?.some(
      (booking) =>
        booking.court_id === courtId &&
        format(new Date(booking.start_time), "HH:00") === timeSlot
    );
  };

  const selectedCourt = courts?.find(court => court.id === selectedCourtId);
  const displayCourts = viewMode === 'single' && selectedCourt ? [selectedCourt] : courts;
  const courtsCount = displayCourts?.length || 0;

  return (
    <div className="h-screen w-screen bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b-2 border-blue-200 shadow-sm">
        <img
          src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
          alt="CDV Logo"
          className="h-12 sm:h-14 md:h-16 lg:h-18"
        />
        <div className="text-right">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-1">
            {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-blue-600 font-semibold">
            {format(currentTime, "h:mm a")}
          </p>
        </div>
      </div>

      {/* View Mode Controls */}
      <div className="flex items-center justify-center gap-4 py-3 bg-gray-50 border-b border-gray-200">
        <Button
          variant={viewMode === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('all')}
          className="flex items-center gap-2"
        >
          <Building2 className="w-4 h-4" />
          Todas las Canchas
        </Button>
        <Button
          variant={viewMode === 'single' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('single')}
          className="flex items-center gap-2"
        >
          <Monitor className="w-4 h-4" />
          Cancha Individual
        </Button>
        {viewMode === 'single' && (
          <select
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar Cancha</option>
            {courts?.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Time Column */}
        <div className="w-20 sm:w-24 md:w-28 bg-gradient-to-b from-gray-50 to-gray-100 border-r-2 border-gray-300 flex flex-col">
          {/* Header spacer */}
          <div className="h-16 bg-blue-200 border-b-2 border-gray-300 flex items-center justify-center">
            <span className="text-sm md:text-base font-bold text-gray-700">Hora</span>
          </div>
          
          {/* Time slots */}
          {timeSlots.map((slot) => {
            const isCurrent = format(currentTime, "HH:00") === slot;
            return (
              <div
                key={`left-${slot}`}
                className={`h-16 flex items-center justify-center border-b border-gray-300 ${
                  isCurrent
                    ? "bg-blue-300 text-blue-900 font-bold shadow-inner"
                    : "text-gray-700 hover:bg-gray-200"
                } transition-colors duration-200`}
              >
                <span className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold">
                  {slot}
                </span>
              </div>
            );
          })}
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col">
          {/* Courts Header */}
          <div 
            className="h-16 bg-gradient-to-r from-blue-200 to-blue-300 border-b-2 border-gray-300 grid shadow-sm"
            style={{ 
              gridTemplateColumns: `repeat(${courtsCount}, 1fr)`
            }}
          >
            {displayCourts?.map((court, index) => (
              <div
                key={`header-${court.id}`}
                className={`flex items-center justify-center ${
                  index < courtsCount - 1 ? 'border-r-2 border-gray-300' : ''
                } hover:bg-blue-400 transition-colors duration-200`}
              >
                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-gray-800 text-center px-2">
                  {court.name}
                </h3>
              </div>
            ))}
          </div>

          {/* Time Slots Grid */}
          <div className="flex-1">
            {timeSlots.map((slot, slotIndex) => {
              const isCurrent = format(currentTime, "HH:00") === slot;
              return (
                <div
                  key={slot}
                  className={`h-16 grid border-b border-gray-300 transition-colors duration-200`}
                  style={{ 
                    gridTemplateColumns: `repeat(${courtsCount}, 1fr)`
                  }}
                >
                  {displayCourts?.map((court, courtIndex) => {
                    const booked = isBooked(court.id, slot);
                    return (
                      <div
                        key={`${court.id}-${slot}`}
                        className={`flex justify-center items-center ${
                          courtIndex < courtsCount - 1 ? 'border-r border-gray-300' : ''
                        } transition-colors duration-200 ${
                          booked
                            ? 'bg-red-500 text-white font-semibold shadow-inner'
                            : isCurrent
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        {booked && (
                          <span className="text-xs sm:text-sm md:text-base font-bold">
                            RESERVADO
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Time Column */}
        <div className="w-20 sm:w-24 md:w-28 bg-gradient-to-b from-gray-50 to-gray-100 border-l-2 border-gray-300 flex flex-col">
          {/* Header spacer */}
          <div className="h-16 bg-blue-200 border-b-2 border-gray-300 flex items-center justify-center">
            <span className="text-sm md:text-base font-bold text-gray-700">Hora</span>
          </div>
          
          {/* Time slots */}
          {timeSlots.map((slot) => {
            const isCurrent = format(currentTime, "HH:00") === slot;
            return (
              <div
                key={`right-${slot}`}
                className={`h-16 flex items-center justify-center border-b border-gray-300 ${
                  isCurrent
                    ? "bg-blue-300 text-blue-900 font-bold shadow-inner"
                    : "text-gray-700 hover:bg-gray-200"
                } transition-colors duration-200`}
              >
                <span className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold">
                  {slot}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
