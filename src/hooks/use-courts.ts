import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Court = {
  id: string;
  name: string;
};

export function useCourts() {
  return useQuery({
    queryKey: ["courts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("*");
      
      if (error) {
        console.error("Error fetching courts:", error);
        throw error;
      }
      
      return data as Court[];
    },
  });
}