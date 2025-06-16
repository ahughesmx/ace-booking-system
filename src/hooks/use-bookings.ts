
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { startOfDay, endOfDay } from "date-fns";

export function useBookings(selectedDate?: Date) {
  return useQuery({
    queryKey: ["bookings", selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];

      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          court:courts(id, name, court_type),
          user:profiles(full_name)
        `)
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString())
        .order("start_time");

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDate,
  });
}
