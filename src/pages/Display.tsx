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
    // Actualizar el tiempo cada minuto
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

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        <div className="flex items-center justify-between mb-12">
          <img
            src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
            alt="CDV Logo"
            className="h-20"
          />
          <div className="text-right">
            <h2 className="text-4xl font-bold">
              {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
            </h2>
            <p className="text-3xl text-muted-foreground">
              {format(currentTime, "h:mm a")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[auto,1fr,auto] gap-8">
          {/* Indicadores izquierdos */}
          <div className="space-y-4">
            {timeSlots.map((slot) => (
              <div
                key={`left-${slot}`}
                className={`h-16 flex items-center justify-end pr-4 text-xl font-medium ${
                  format(currentTime, "HH:00") === slot
                    ? "text-blue-500 font-bold"
                    : ""
                }`}
              >
                {slot}
              </div>
            ))}
          </div>

          {/* Tabla central */}
          <div className="border-2 rounded-lg overflow-hidden shadow-lg bg-white">
            <div className="grid grid-cols-4 divide-x-2">
              {courts?.map((court) => (
                <div key={court.id} className="text-center">
                  <div className="bg-blue-50 p-6">
                    <h3 className="text-2xl font-bold">{court.name}</h3>
                  </div>
                  <div className="divide-y-2">
                    {timeSlots.map((slot) => {
                      const booked = isBooked(court.id, slot);
                      const isCurrent = format(currentTime, "HH:00") === slot;
                      return (
                        <div
                          key={`${court.id}-${slot}`}
                          className={`h-16 flex justify-center items-center ${
                            isCurrent ? "bg-blue-50" : ""
                          }`}
                        >
                          {booked ? (
                            <CheckSquare className="w-8 h-8 text-blue-500" />
                          ) : (
                            <Square className="w-8 h-8 text-gray-300" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Indicadores derechos */}
          <div className="space-y-4">
            {timeSlots.map((slot) => (
              <div
                key={`right-${slot}`}
                className={`h-16 flex items-center pl-4 text-xl font-medium ${
                  format(currentTime, "HH:00") === slot
                    ? "text-blue-500 font-bold"
                    : ""
                }`}
              >
                {slot}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
