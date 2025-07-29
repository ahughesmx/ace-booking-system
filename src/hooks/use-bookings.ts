
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Booking, RegularBooking, SpecialBooking } from "@/types/booking";

export function useBookings(selectedDate?: Date) {
  return useQuery({
    queryKey: ["bookings", selectedDate?.toDateString()],
    queryFn: async () => {
      if (!selectedDate) {
        console.log("🚫 No selected date provided");
        return [];
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log("📅 Fetching regular bookings for:", {
        selectedDate: selectedDate.toISOString(),
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        filterStatus: "paid"
      });

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          court:courts(id, name, court_type),
          user:profiles(full_name, member_id)
        `)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .eq("status", "paid")
        .order("start_time");

      if (error) {
        console.error("❌ Error fetching regular bookings:", error);
        return [];
      }

      console.log("✅ Regular bookings fetched:", data?.length || 0, data);
      return data || [];
    },
    enabled: !!selectedDate,
  });
}

export function useSpecialBookings(selectedDate?: Date) {
  return useQuery({
    queryKey: ["special-bookings", selectedDate?.toDateString()],
    queryFn: async () => {
      if (!selectedDate) {
        console.log("🚫 No selected date provided for special bookings");
        return [];
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log("🎯 Fetching special bookings for:", {
        selectedDate: selectedDate.toISOString(),
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
      });

      const { data, error } = await supabase
        .from("special_bookings")
        .select(`
          *,
          court:courts(id, name, court_type),
          reference_user:profiles!special_bookings_reference_user_id_fkey(full_name, member_id)
        `)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .order("start_time");

      if (error) {
        console.error("❌ Error fetching special bookings:", error);
        return [];
      }

      console.log("✅ Special bookings fetched:", data?.length || 0, data);
      return data || [];
    },
    enabled: !!selectedDate,
    staleTime: 30000,
    gcTime: 60000,
  });
}

export function useAllBookings(selectedDate?: Date): { data: Booking[], isLoading: boolean } {
  const { data: regularBookings = [], isLoading: loadingRegular } = useBookings(selectedDate);
  const { data: specialBookings = [], isLoading: loadingSpecial } = useSpecialBookings(selectedDate);

  const transformedRegularBookings: RegularBooking[] = regularBookings.map(booking => ({
    id: booking.id,
    court_id: booking.court_id,
    user_id: booking.user_id,
    start_time: booking.start_time,
    end_time: booking.end_time,
    created_at: booking.created_at,
    booking_made_at: booking.booking_made_at,
    user: booking.user,
    court: booking.court,
    isSpecial: false
  }));

  const transformedSpecialBookings: SpecialBooking[] = specialBookings.map(booking => ({
    id: `special-${booking.id}`,
    court_id: booking.court_id,
    user_id: booking.reference_user_id,
    start_time: booking.start_time,
    end_time: booking.end_time,
    created_at: booking.created_at,
    booking_made_at: booking.created_at,
    user: booking.reference_user ? {
      full_name: booking.reference_user.full_name,
      member_id: booking.reference_user.member_id
    } : null,
    court: booking.court,
    isSpecial: true,
    event_type: booking.event_type,
    title: booking.title,
    description: booking.description,
    reference_user_id: booking.reference_user_id,
  }));

  const allBookings: Booking[] = [
    ...transformedRegularBookings,
    ...transformedSpecialBookings
  ];

  console.log("📊 Combined bookings data:", {
    regular: transformedRegularBookings.length,
    special: transformedSpecialBookings.length,
    total: allBookings.length,
    date: selectedDate?.toDateString(),
    regularBookings: transformedRegularBookings,
    specialBookings: transformedSpecialBookings
  });

  return {
    data: allBookings,
    isLoading: loadingRegular || loadingSpecial
  };
}

// Updated to only count non-expired bookings
export function useCourtAvailability(courtId: string, startTime: Date, endTime: Date) {
  return useQuery({
    queryKey: ["court-availability", courtId, startTime.toISOString(), endTime.toISOString()],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("court_maintenance")
        .select("id, start_time, end_time, reason")
        .eq("court_id", courtId)
        .eq("is_active", true)
        .gte("end_time", now) // Only active maintenance
        .or(`and(start_time.lte.${startTime.toISOString()},end_time.gt.${startTime.toISOString()}),and(start_time.lt.${endTime.toISOString()},end_time.gte.${endTime.toISOString()}),and(start_time.gte.${startTime.toISOString()},end_time.lte.${endTime.toISOString()})`);

      if (maintenanceError) throw maintenanceError;

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("id")
        .eq("court_id", courtId)
        .eq("status", "paid") // Only count paid bookings for availability
        .gte("end_time", now) // Only non-expired bookings
        .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

      if (bookingError) throw bookingError;

      const { data: specialBookingData, error: specialBookingError } = await supabase
        .from("special_bookings")
        .select("id")
        .eq("court_id", courtId)
        .gte("end_time", now) // Only non-expired special bookings
        .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

      if (specialBookingError) throw specialBookingError;

      return {
        isAvailable: !maintenanceData?.length && !bookingData?.length && !specialBookingData?.length,
        maintenanceReason: maintenanceData?.[0]?.reason,
        hasBookings: !!bookingData?.length,
        hasSpecialBookings: !!specialBookingData?.length,
        hasMaintenace: !!maintenanceData?.length
      };
    },
    enabled: !!(courtId && startTime && endTime),
  });
}

// Updated hook to get user's active bookings count (non-expired only)
export function useActiveBookingsCount(userId?: string) {
  return useQuery({
    queryKey: ["active-bookings-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("bookings")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "paid") // Only count paid bookings as active
        .gte("end_time", now); // Only count non-expired bookings

      if (error) {
        console.error("Error counting active bookings:", error);
        return 0;
      }

      const count = data?.length || 0;
      
      console.log("📊 Active bookings count update:", {
        userId,
        count,
        currentTime: now
      });
      
      // Update the profiles table with the current count
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ active_bookings: count })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating active bookings count:", updateError);
      }

      return count;
    },
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchInterval: 60000, // Refetch every minute to keep count updated
  });
}
