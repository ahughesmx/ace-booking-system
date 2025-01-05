import { useQuery } from "@tanstack/react-query";
import { handleSupabaseResponse, supabase } from "@/lib/supabase-client";
import type { Database } from "@/integrations/supabase/types";

export type Court = Database['public']['Tables']['courts']['Row'];

export function useCourts() {
  return useQuery({
    queryKey: ["courts"],
    queryFn: () => 
      handleSupabaseResponse(
        supabase.from("courts").select("*")
      ),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
    retryDelay: 1000,
  });
}