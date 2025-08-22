
import { useAuth } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useAllBookings, useActiveBookingsCount } from "@/hooks/use-bookings";
import { useBookingRules } from "@/hooks/use-booking-rules";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Hook para obtener todas las reservas incluyendo pending_payment
function useAllBookingsIncludingPending(selectedDate?: Date) {
  return useQuery({
    queryKey: ["all-bookings-including-pending", selectedDate?.toDateString()],
    queryFn: async () => {
      if (!selectedDate) return [];

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          court_id,
          start_time,
          end_time,
          status,
          expires_at,
          court:courts(id, name, court_type)
        `)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .in("status", ["paid", "pending_payment"])
        .order("start_time");

      if (error) {
        console.error("❌ Error fetching all bookings:", error);
        return [];
      }

      const now = new Date();
      const validBookings = (data || []).filter(booking => {
        // Keep paid bookings
        if (booking.status === 'paid') return true;
        
        // For pending payments, only keep if not expired
        if (booking.status === 'pending_payment') {
          if (!booking.expires_at) return false;
          const expiresAt = new Date(booking.expires_at);
          const isExpired = expiresAt <= now;
          
          // If expired, delete it
          if (isExpired) {
            console.log(`🗑️ Eliminando reserva expirada: ${booking.id}`);
            supabase.from("bookings").delete().eq("id", booking.id).then(({ error }) => {
              if (error) console.error("Error deleting expired booking:", error);
            });
            return false;
          }
          return true;
        }
        
        return false;
      });

      return validBookings;
    },
    enabled: !!selectedDate,
  });
}

export function useBookingLogic(selectedDate?: Date, selectedCourtType?: string | null) {
  const { user } = useAuth();
  const { data: allBookingsWithPending = [] } = useAllBookingsIncludingPending(selectedDate);
  const { data: bookingRules } = useBookingRules(selectedCourtType as 'tennis' | 'padel');

  // Use the new hook that counts only non-expired bookings
  const { data: userActiveBookings = 0 } = useActiveBookingsCount(user?.id);

  console.log('BookingLogic - Updated active bookings count:', userActiveBookings);

  // Create set of booked slots for the selected court type (including special bookings and pending payments)
  const bookedSlots = new Set<string>();
  if (selectedDate && selectedCourtType) {
    allBookingsWithPending.forEach(booking => {
      // Include both paid bookings and active pending payments (not expired)
      const isPaidBooking = booking.status === 'paid';
      const isPendingNotExpired = booking.status === 'pending_payment' && 
        booking.expires_at && new Date(booking.expires_at) > new Date();
      
      console.log(`🔍 EVALUANDO BOOKING ${booking.id}:`, {
        status: booking.status,
        expires_at: booking.expires_at,
        isPaidBooking,
        isPendingNotExpired,
        courtType: booking.court?.court_type,
        selectedCourtType,
        startTime: booking.start_time,
        hour: new Date(booking.start_time).getHours()
      });
      
      if ((isPaidBooking || isPendingNotExpired) && booking.court && booking.court.court_type === selectedCourtType) {
        const hour = new Date(booking.start_time).getHours();
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        console.log(`✅ AGREGANDO SLOT OCUPADO: ${timeSlot}`);
        bookedSlots.add(timeSlot);
      } else {
        console.log(`❌ BOOKING NO INCLUIDO EN SLOTS OCUPADOS`);
      }
    });
  }

  console.log(`📊 SLOTS OCUPADOS FINALES para ${selectedCourtType}:`, Array.from(bookedSlots));

  return {
    user,
    bookingRules,
    userActiveBookings,
    bookedSlots,
  };
}
