import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { Match } from "@/types/match";

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      console.log("Fetching matches via Edge Function...");
      const { data, error } = await supabase.functions.invoke('get-matches');
      
      if (error) {
        console.error("Error fetching matches:", error);
        throw error;
      }
      
      console.log("Matches data:", data);
      return data as Match[];
    },
  });
}