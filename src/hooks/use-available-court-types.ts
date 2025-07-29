import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

type AvailableCourtType = {
  id: string;
  type_name: string;
  display_name: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export function useAvailableCourtTypes(onlyEnabled?: boolean) {
  return useQuery({
    queryKey: ["available-court-types", onlyEnabled],
    queryFn: async () => {
      let query = supabase
        .from("available_court_types")
        .select("*")
        .order("display_name");

      if (onlyEnabled) {
        query = query.eq("is_enabled", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AvailableCourtType[];
    },
  });
}