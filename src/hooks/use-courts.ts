
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { Database } from "@/integrations/supabase/types";

export type Court = Database['public']['Tables']['courts']['Row'];

export function useCourts(courtType?: string | null) {
  return useQuery({
    queryKey: ["courts", courtType],
    queryFn: async () => {
      let query = supabase.from("courts").select("*");
      
      // Filtrar por tipo de cancha si se especifica y no es null
      if (courtType && courtType !== null) {
        query = query.eq('court_type', courtType);
      }
      
      const { data, error } = await query.order("name");
      
      if (error) throw error;
      if (!data) return [];
      
      console.log("useCourts - courtType:", courtType);
      console.log("useCourts - data:", data);
      
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
    retryDelay: 1000,
  });
}
