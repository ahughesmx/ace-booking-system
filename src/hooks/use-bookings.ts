import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Booking } from "@/types/booking";

export function useBookings(selectedDate?: Date) {
  return useQuery({
    queryKey: ["bookings", selectedDate?.toDateString()],
    queryFn: async () => {
      if (!selectedDate) {
        console.log("🚫 No selected date provided");
        return [];
      }

      // Create date range for the entire day in local timezone
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log("📅 Fetching regular bookings for:", {
        selectedDate: selectedDate.toISOString(),
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
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

      // Create date range for the entire day in local timezone
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
          court:courts(id, name, court_type)
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
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 60000, // Keep in garbage collection for 1 minute
  });
}

export function useAllBookings(selectedDate?: Date): { data: Booking[], isLoading: boolean } {
  const { data: regularBookings = [], isLoading: loadingRegular } = useBookings(selectedDate);
  const { data: specialBookings = [], isLoading: loadingSpecial } = useSpecialBookings(selectedDate);

  // Transform regular bookings to include isSpecial flag
  const transformedRegularBookings: Booking[] = regularBookings.map(booking => ({
    id: booking.id,
    court_id: booking.court_id,
    user_id: booking.user_id,
    start_time: booking.start_time,
    end_time: booking.end_time,
    created_at: booking.created_at,
    booking_made_at: booking.booking_made_at,
    user: booking.user,
    court: booking.court,
    isSpecial: false as const
  }));

  // Transform special bookings to match Booking interface
  const transformedSpecialBookings: Booking[] = specialBookings.map(booking => ({
    id: `special-${booking.id}`,
    court_id: booking.court_id,
    user_id: null,
    start_time: booking.start_time,
    end_time: booking.end_time,
    created_at: booking.created_at,
    booking_made_at: booking.created_at,
    user: null,
    court: booking.court,
    isSpecial: true as const,
    event_type: booking.event_type,
    title: booking.title,
    description: booking.description,
  }));

  const allBookings = [
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

export function useCourtAvailability(courtId: string, startTime: Date, endTime: Date) {
  return useQuery({
    queryKey: ["court-availability", courtId, startTime.toISOString(), endTime.toISOString()],
    queryFn: async () => {
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("court_maintenance")
        .select("id, start_time, end_time, reason")
        .eq("court_id", courtId)
        .eq("is_active", true)
        .or(`and(start_time.lte.${startTime.toISOString()},end_time.gt.${startTime.toISOString()}),and(start_time.lt.${endTime.toISOString()},end_time.gte.${endTime.toISOString()}),and(start_time.gte.${startTime.toISOString()},end_time.lte.${endTime.toISOString()})`);

      if (maintenanceError) throw maintenanceError;

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("id")
        .eq("court_id", courtId)
        .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

      if (bookingError) throw bookingError;

      const { data: specialBookingData, error: specialBookingError } = await supabase
        .from("special_bookings")
        .select("id")
        .eq("court_id", courtId)
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
