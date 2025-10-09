import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export function useAffectedBookings(userId?: string) {
  return useQuery({
    queryKey: ["affected-bookings", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("affected_bookings")
        .select(`
          id,
          booking_id,
          maintenance_id,
          user_notified,
          notified_at,
          can_reschedule,
          rescheduled,
          rescheduled_at,
          created_at
        `)
        .eq("can_reschedule", true)
        .eq("rescheduled", false);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useIsBookingAffected(bookingId?: string) {
  return useQuery({
    queryKey: ["is-booking-affected", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from("affected_bookings")
        .select("*, maintenance:court_maintenance!inner(*)")
        .eq("booking_id", bookingId)
        .eq("can_reschedule", true)
        .eq("rescheduled", false)
        .eq("maintenance.is_active", true) // Solo cierres activos
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });
}
