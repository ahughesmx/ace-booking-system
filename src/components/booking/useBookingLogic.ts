
import { useAuth } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useAllBookings } from "@/hooks/use-bookings";
import { useBookingRules } from "@/hooks/use-booking-rules";
import { format } from "date-fns";

export function useBookingLogic(selectedDate?: Date, selectedCourtType?: 'tennis' | 'padel' | null) {
  const { user } = useAuth();
  const { data: allBookings = [] } = useAllBookings(selectedDate);
  const { data: bookingRules } = useBookingRules(selectedCourtType);

  // Usar el campo active_bookings de la tabla profiles
  const { data: userActiveBookings = 0 } = useQuery({
    queryKey: ["userActiveBookings", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      console.log("Fetching active bookings from profiles table for user:", user.id);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("active_bookings")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching active bookings from profiles:", error);
        return 0;
      }
      
      console.log("Active bookings from profiles table:", data?.active_bookings || 0);
      return data?.active_bookings || 0;
    },
    enabled: !!user?.id
  });

  // Crear set de slots reservados para el tipo de cancha seleccionado (incluyendo reservas especiales)
  const bookedSlots = new Set<string>();
  if (selectedDate && selectedCourtType) {
    allBookings.forEach(booking => {
      if (booking.court && booking.court.court_type === selectedCourtType) {
        const hour = new Date(booking.start_time).getHours();
        bookedSlots.add(`${hour.toString().padStart(2, '0')}:00`);
      }
    });
  }

  return {
    user,
    bookingRules,
    userActiveBookings,
    bookedSlots,
  };
}
