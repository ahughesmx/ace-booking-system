
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export function useCourtMaintenance(courtId?: string) {
  return useQuery({
    queryKey: ["court-maintenance", courtId],
    queryFn: async () => {
      let query = supabase
        .from("court_maintenance")
        .select(`
          id,
          court_id,
          start_time,
          end_time,
          reason,
          is_active,
          created_at,
          court:courts(id, name, court_type)
        `)
        .eq("is_active", true)
        .gte("end_time", new Date().toISOString())
        .order("start_time");

      if (courtId) {
        query = query.eq("court_id", courtId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useActiveMaintenancePeriods() {
  return useQuery({
    queryKey: ["active-maintenance"],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("court_maintenance")
        .select("court_id, start_time, end_time")
        .eq("is_active", true)
        .lte("start_time", now)
        .gte("end_time", now);

      if (error) throw error;
      
      // Crear un Set de court_ids que están actualmente en mantenimiento
      const maintenanceCourts = new Set(data?.map(m => m.court_id) || []);
      return maintenanceCourts;
    },
    staleTime: 1000 * 60, // 1 minuto
  });
}
