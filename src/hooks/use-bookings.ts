
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { startOfDay, endOfDay } from "date-fns";
import { Booking } from "@/types/booking";

export function useBookings(selectedDate?: Date) {
  console.log("useBookings hook called with selectedDate:", selectedDate);
  console.log("selectedDate type:", typeof selectedDate);
  console.log("selectedDate instanceof Date:", selectedDate instanceof Date);
  
  return useQuery({
    queryKey: ["bookings", selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) {
        console.log("No selectedDate provided, returning empty array");
        return [];
      }

      if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
        console.error("Invalid selectedDate provided:", selectedDate);
        return [];
      }

      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);

      console.log("Fetching bookings for date:", selectedDate);
      console.log("Date range:", { start: start.toISOString(), end: end.toISOString() });

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          court:courts(id, name, court_type),
          user:profiles(full_name, member_id)
        `)
        .gte("start_time", start.toISOString())
        .lt("start_time", end.toISOString())
        .order("start_time");

      if (error) {
        console.error("Error fetching bookings:", error);
        throw error;
      }

      console.log("Fetched regular bookings:", data);
      console.log("Query used:", {
        start: start.toISOString(),
        end: end.toISOString(),
        filter: "start_time >= start AND start_time < end"
      });
      
      return data || [];
    },
    enabled: !!selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime()),
  });
}

// Hook para obtener reservas especiales
export function useSpecialBookings(selectedDate?: Date) {
  console.log("useSpecialBookings hook called with selectedDate:", selectedDate);
  
  return useQuery({
    queryKey: ["special-bookings", selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) {
        console.log("No selectedDate provided for special bookings, returning empty array");
        return [];
      }

      if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
        console.error("Invalid selectedDate provided for special bookings:", selectedDate);
        return [];
      }

      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);

      console.log("🔍 SPECIAL BOOKINGS QUERY DEBUG:");
      console.log("- Selected date:", selectedDate.toISOString());
      console.log("- Query start time:", start.toISOString());
      console.log("- Query end time:", end.toISOString());
      console.log("- Timezone offset:", selectedDate.getTimezoneOffset());

      const { data, error } = await supabase
        .from("special_bookings")
        .select(`
          *,
          court:courts(id, name, court_type)
        `)
        .gte("start_time", start.toISOString())
        .lt("start_time", end.toISOString())
        .order("start_time");

      if (error) {
        console.error("Error fetching special bookings:", error);
        throw error;
      }

      console.log("🎯 SPECIAL BOOKINGS RAW DATA:", data);
      console.log("🎯 Number of special bookings found:", data?.length || 0);
      
      // Debug cada reserva especial
      data?.forEach((booking, index) => {
        console.log(`🎯 Special booking #${index + 1}:`, {
          id: booking.id,
          title: booking.title,
          event_type: booking.event_type,
          start_time: booking.start_time,
          start_time_date: new Date(booking.start_time),
          court_id: booking.court_id,
          court: booking.court
        });
      });
      
      return data || [];
    },
    enabled: !!selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime()),
  });
}

// Hook combinado para obtener todas las reservas (normales + especiales)
export function useAllBookings(selectedDate?: Date): { data: Booking[], isLoading: boolean } {
  const { data: regularBookings = [], isLoading: loadingRegular } = useBookings(selectedDate);
  const { data: specialBookings = [], isLoading: loadingSpecial } = useSpecialBookings(selectedDate);

  console.log("📊 useAllBookings SUMMARY:");
  console.log("- Regular bookings count:", regularBookings.length);
  console.log("- Special bookings count:", specialBookings.length);
  console.log("- Selected date:", selectedDate?.toISOString());

  // Transformar reservas especiales al formato común con tipos explícitos
  const transformedSpecialBookings: Booking[] = specialBookings?.map(sb => {
    console.log("🔄 Transforming special booking:", {
      original_id: sb.id,
      title: sb.title,
      event_type: sb.event_type,
      start_time: sb.start_time,
      court_id: sb.court_id
    });
    
    const transformed: Booking = {
      id: `special-${sb.id}`,
      court_id: sb.court_id,
      user_id: null,
      start_time: sb.start_time,
      end_time: sb.end_time,
      created_at: sb.created_at,
      booking_made_at: sb.created_at,
      user: null,
      court: sb.court,
      isSpecial: true,
      event_type: sb.event_type,
      title: sb.title,
      description: sb.description,
    };
    
    console.log("✅ Transformed result:", {
      id: transformed.id,
      isSpecial: transformed.isSpecial,
      title: transformed.title,
      event_type: transformed.event_type
    });
    
    return transformed;
  }) || [];

  // Transformar reservas regulares para incluir isSpecial: false
  const transformedRegularBookings: Booking[] = regularBookings.map(rb => ({
    ...rb,
    isSpecial: false
  }));

  const allBookings = [
    ...transformedRegularBookings,
    ...transformedSpecialBookings
  ];

  console.log("📈 FINAL COMBINED BOOKINGS:");
  console.log("- Total bookings:", allBookings.length);
  console.log("- Regular bookings:", transformedRegularBookings.length);
  console.log("- Special bookings:", transformedSpecialBookings.length);
  console.log("- All bookings with isSpecial=true:", allBookings.filter(b => b.isSpecial === true).length);

  return {
    data: allBookings,
    isLoading: loadingRegular || loadingSpecial
  };
}

// Nueva función para verificar si una cancha está en mantenimiento
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

      // Verificar reservas especiales
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
