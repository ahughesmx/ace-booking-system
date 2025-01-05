import { useQuery } from "@tanstack/react-query";
import { handleSupabaseResponse, supabase } from "@/lib/supabase-client";

export type Court = {
  id: string;
  name: string;
};

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