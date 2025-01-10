import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckSquare, Square } from "lucide-react";

export default function Display() {
  const { data: displaySettings } = useQuery({
    queryKey: ["display-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("display_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
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
    // Prevent screen from sleeping
    const wakeLock = async () => {
      try {
        await navigator.wakeLock.request("screen");
      } catch (err) {
        console.log(`${err.name}, ${err.message}`);
      }
    };
    wakeLock();
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

  // Generate time slots from 7:00 to 23:00
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 7;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <img
            src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
            alt="CDV Logo"
            className="h-16"
          />
          <div className="text-right">
            <h2 className="text-2xl font-bold">
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </h2>
            <p className="text-xl text-muted-foreground">
              {format(new Date(), "h:mm a")}
            </p>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-4 text-left">Horario</th>
                {courts?.map((court) => (
                  <th key={court.id} className="p-4 text-center">
                    {court.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((timeSlot, index) => {
                const isCurrentHour =
                  format(new Date(), "HH:00") === timeSlot;
                return (
                  <tr
                    key={timeSlot}
                    className={`${
                      isCurrentHour ? "bg-blue-50" : index % 2 === 0 ? "bg-gray-50" : ""
                    }`}
                  >
                    <td className="p-4 font-medium">{timeSlot}</td>
                    {courts?.map((court) => {
                      const isBooked = bookings?.some(
                        (booking) =>
                          booking.court_id === court.id &&
                          format(new Date(booking.start_time), "HH:00") === timeSlot
                      );
                      return (
                        <td key={court.id} className="p-4">
                          <div className="flex justify-center">
                            {isBooked ? (
                              <CheckSquare className="w-6 h-6 text-blue-500" />
                            ) : (
                              <Square className="w-6 h-6 text-gray-300" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}