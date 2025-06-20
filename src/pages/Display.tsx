
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckSquare, Square } from "lucide-react";

// Generate time slots from 7:00 to 23:00
const timeSlots = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 7;
  return `${hour.toString().padStart(2, "0")}:00`;
});

export default function Display() {
  const [currentTime, setCurrentTime] = useState(new Date());

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

      // Return default settings if none exist
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
    refetchInterval: 30000, // Refetch every 30 seconds
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
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Prevent screen from sleeping
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

  const courtsCount = courts?.length || 0;

  return (
    <div className="h-screen w-screen bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b-2 border-blue-100">
        <img
          src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
          alt="CDV Logo"
          className="h-12 sm:h-16 md:h-20"
        />
        <div className="text-right">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">
            {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-blue-600 font-medium">
            {format(currentTime, "h:mm a")}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Time slots column - Left */}
        <div className="w-16 sm:w-20 md:w-24 bg-gray-50 border-r-2 border-gray-200 flex flex-col">
          <div className="h-12 sm:h-14 md:h-16 bg-blue-100 border-b-2 border-gray-200"></div>
          {timeSlots.map((slot) => {
            const isCurrent = format(currentTime, "HH:00") === slot;
            return (
              <div
                key={`left-${slot}`}
                className={`flex-1 flex items-center justify-center text-xs sm:text-sm md:text-base lg:text-lg font-medium border-b border-gray-200 ${
                  isCurrent
                    ? "bg-blue-200 text-blue-800 font-bold"
                    : "text-gray-700"
                }`}
              >
                {slot}
              </div>
            );
          })}
        </div>

        {/* Courts grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Courts header */}
          <div 
            className="h-12 sm:h-14 md:h-16 bg-blue-100 border-b-2 border-gray-200 grid"
            style={{ gridTemplateColumns: `repeat(${courtsCount}, 1fr)` }}
          >
            {courts?.map((court) => (
              <div
                key={`header-${court.id}`}
                className="flex items-center justify-center border-r border-gray-200 last:border-r-0"
              >
                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-gray-800 text-center">
                  {court.name}
                </h3>
              </div>
            ))}
          </div>

          {/* Time slots grid */}
          <div className="flex-1 overflow-hidden">
            {timeSlots.map((slot) => {
              const isCurrent = format(currentTime, "HH:00") === slot;
              return (
                <div
                  key={slot}
                  className={`grid border-b border-gray-200 ${
                    isCurrent ? "bg-blue-50" : "bg-white"
                  }`}
                  style={{ 
                    gridTemplateColumns: `repeat(${courtsCount}, 1fr)`,
                    height: `calc((100vh - 200px) / ${timeSlots.length})`
                  }}
                >
                  {courts?.map((court) => {
                    const booked = isBooked(court.id, slot);
                    return (
                      <div
                        key={`${court.id}-${slot}`}
                        className="flex justify-center items-center border-r border-gray-200 last:border-r-0"
                      >
                        {booked ? (
                          <CheckSquare className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-blue-500" />
                        ) : (
                          <Square className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-gray-300" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Time slots column - Right */}
        <div className="w-16 sm:w-20 md:w-24 bg-gray-50 border-l-2 border-gray-200 flex flex-col">
          <div className="h-12 sm:h-14 md:h-16 bg-blue-100 border-b-2 border-gray-200"></div>
          {timeSlots.map((slot) => {
            const isCurrent = format(currentTime, "HH:00") === slot;
            return (
              <div
                key={`right-${slot}`}
                className={`flex-1 flex items-center justify-center text-xs sm:text-sm md:text-base lg:text-lg font-medium border-b border-gray-200 ${
                  isCurrent
                    ? "bg-blue-200 text-blue-800 font-bold"
                    : "text-gray-700"
                }`}
              >
                {slot}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
