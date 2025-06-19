
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { startOfDay, endOfDay } from "date-fns";

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

      console.log("Fetched bookings:", data);
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

      return {
        isAvailable: !maintenanceData?.length && !bookingData?.length,
        maintenanceReason: maintenanceData?.[0]?.reason,
        hasBookings: !!bookingData?.length,
        hasMaintenace: !!maintenanceData?.length
      };
    },
    enabled: !!(courtId && startTime && endTime),
  });
}
