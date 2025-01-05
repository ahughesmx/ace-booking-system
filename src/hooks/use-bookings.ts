import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Booking } from "@/types/booking";

export function useBookings(date: Date | undefined) {
  return useQuery({
    queryKey: ["bookings", date],
    queryFn: async () => {
      if (!date) return [];
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("bookings")
        .select("*, court:courts(name), user:profiles(full_name)")
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString());
      
      if (error) {
        console.error("Error fetching bookings:", error);
        throw error;
      }
      
      return data as Booking[];
    },
    enabled: !!date,
    retry: 1, // Reducimos a 1 solo reintento
    retryDelay: 1000, // Esperamos 1 segundo antes de reintentar
  });
}