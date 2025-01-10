import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { Database } from "@/integrations/supabase/types";
import type { Booking } from "@/types/booking";

export { type Booking };

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
        .select("*, court:courts(name), user:profiles(full_name, member_id)")
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString());

      if (error) throw error;
      if (!data) return [];
      
      console.log('Bookings data:', data); // Para debugging
      
      return data as Booking[];
    },
    enabled: !!date,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    retryDelay: 1000,
  });
}