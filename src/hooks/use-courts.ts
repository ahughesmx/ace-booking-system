
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { Database } from "@/integrations/supabase/types";

export type Court = Database['public']['Tables']['courts']['Row'];

export function useCourts(courtType?: 'tennis' | 'padel' | null) {
  return useQuery({
    queryKey: ["courts", courtType],
    queryFn: async () => {
      let query = supabase.from("courts").select("*");
      
      // Filtrar por tipo de cancha si se especifica
      if (courtType) {
        query = query.eq('court_type', courtType);
      }
      
      const { data, error } = await query.order("name");
      
      if (error) throw error;
      if (!data) return [];
      
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
    retryDelay: 1000,
    enabled: courtType !== null, // Solo ejecutar cuando se haya seleccionado un tipo
  });
}
