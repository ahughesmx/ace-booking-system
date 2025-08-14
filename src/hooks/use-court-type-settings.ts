
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

type CourtTypeSettings = {
  id: string;
  court_type: string;
  operating_hours_start: string;
  operating_hours_end: string;
  min_booking_duration: number;
  max_booking_duration: number;
  default_booking_duration: number;
  price_per_hour: number;
  operador_price_per_hour: number;
  peak_hours_start: string;
  peak_hours_end: string;
  peak_hours_multiplier: number;
  max_capacity: number;
  advance_booking_days: number;
  weekend_price_multiplier: number;
  operating_days: string[];
  created_at: string;
  updated_at: string;
};

export function useCourtTypeSettings(courtType?: string) {
  return useQuery({
    queryKey: ["court-type-settings", courtType],
    queryFn: async () => {
      let query = supabase
        .from("court_type_settings")
        .select("*");

      if (courtType) {
        query = query.eq("court_type", courtType);
      }

      const { data, error } = await query.order("court_type");

      if (error) throw error;

      if (courtType) {
        return data?.[0] as CourtTypeSettings | null;
      }

      return data as CourtTypeSettings[];
    },
  });
}
