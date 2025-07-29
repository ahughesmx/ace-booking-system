
import { useAuth } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useAllBookings, useActiveBookingsCount } from "@/hooks/use-bookings";
import { useBookingRules } from "@/hooks/use-booking-rules";
import { format } from "date-fns";

export function useBookingLogic(selectedDate?: Date, selectedCourtType?: string | null) {
  const { user } = useAuth();
  const { data: allBookings = [] } = useAllBookings(selectedDate);
  const { data: bookingRules } = useBookingRules(selectedCourtType as 'tennis' | 'padel');

  // Use the new hook that counts only non-expired bookings
  const { data: userActiveBookings = 0 } = useActiveBookingsCount(user?.id);

  console.log('BookingLogic - Updated active bookings count:', userActiveBookings);

  // Create set of booked slots for the selected court type (including special bookings)
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
