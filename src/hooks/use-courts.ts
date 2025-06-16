
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { Database } from "@/integrations/supabase/types";

export type Court = Database['public']['Tables']['courts']['Row'] & {
  court_type?: 'tennis' | 'padel';
};

export function useCourts(courtType?: 'tennis' | 'padel' | null) {
  return useQuery({
    queryKey: ["courts", courtType],
    queryFn: async () => {
      let query = supabase.from("courts").select("*");
      
      // Por ahora, como solo hay una cancha de pádel, vamos a simular el filtrado
      // En el futuro cuando se agregue la columna court_type a la BD, se puede filtrar así:
      // if (courtType) {
      //   query = query.eq('court_type', courtType);
      // }
      
      const { data, error } = await query;
      
      if (error) throw error;
      if (!data) return [];
      
      // Simulación temporal: asumiendo que la primera cancha es de pádel
      // y las demás son de tenis (cuando las haya)
      const courtsWithType = data.map((court, index) => ({
        ...court,
        court_type: index === 0 ? 'padel' as const : 'tennis' as const
      }));
      
      // Filtrar por tipo si se especifica
      if (courtType) {
        return courtsWithType.filter(court => court.court_type === courtType);
      }
      
      return courtsWithType;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
    retryDelay: 1000,
    enabled: courtType !== null, // Solo ejecutar cuando se haya seleccionado un tipo
  });
}
