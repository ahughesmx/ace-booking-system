import { useQuery } from "@tanstack/react-query";
import { handleSupabaseResponse, supabase } from "@/lib/supabase-client";
import type { Database } from "@/integrations/supabase/types";

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type CourtRow = Database['public']['Tables']['courts']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export type Booking = BookingRow & {
  court: Pick<CourtRow, 'name'>;
  user: Pick<ProfileRow, 'full_name'>;
};

export function useBookings(date: Date | undefined) {
  return useQuery({
    queryKey: ["bookings", date],
    queryFn: async () => {
      if (!date) return [];
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return handleSupabaseResponse(
        supabase
          .from("bookings")
          .select("*, court:courts(name), user:profiles(full_name)")
          .gte("start_time", startOfDay.toISOString())
          .lte("end_time", endOfDay.toISOString())
      );
    },
    enabled: !!date,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
    retryDelay: 1000,
  });
}