import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

type BookingRules = {
  id: string;
  court_type: string;
  max_active_bookings: number;
  min_cancellation_time: string;
  allow_consecutive_bookings: boolean;
  allow_cancellation: boolean;
  time_between_bookings: string;
  min_advance_booking_time: string;
  max_days_ahead: number;
  created_at: string;
  updated_at: string;
  allow_rescheduling?: boolean;
  min_rescheduling_time?: string;
};

// Overload signatures for better type inference
export function useBookingRules(courtType: 'tennis' | 'padel'): ReturnType<typeof useQuery<BookingRules | null>>;
export function useBookingRules(): ReturnType<typeof useQuery<BookingRules[]>>;
export function useBookingRules(courtType?: 'tennis' | 'padel') {
  return useQuery({
    queryKey: ["booking-rules", courtType],
    queryFn: async () => {
      let query = supabase
        .from("booking_rules")
        .select("*");

      if (courtType) {
        query = query.eq("court_type", courtType);
        
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        return data as BookingRules | null;
      }

      const { data, error } = await query.order("court_type");
      if (error) throw error;
      return data as BookingRules[];
    },
  });
}