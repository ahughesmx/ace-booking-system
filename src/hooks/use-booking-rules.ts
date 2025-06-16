
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

type BookingRules = {
  id: string;
  court_type: string;
  max_active_bookings: number;
  min_cancellation_time: string;
  allow_consecutive_bookings: boolean;
  time_between_bookings: string;
  max_days_ahead: number;
  created_at: string;
  updated_at: string;
};

export function useBookingRules(courtType?: 'tennis' | 'padel') {
  return useQuery({
    queryKey: ["booking-rules", courtType],
    queryFn: async () => {
      let query = supabase
        .from("booking_rules")
        .select("*");

      if (courtType) {
        query = query.eq("court_type", courtType);
      }

      const { data, error } = await query.order("court_type");

      if (error) throw error;

      // When a specific courtType is provided, return single object or null
      if (courtType) {
        return data?.[0] as BookingRules | null;
      }

      // When no courtType is provided, return array
      return data as BookingRules[];
    },
  });
}
