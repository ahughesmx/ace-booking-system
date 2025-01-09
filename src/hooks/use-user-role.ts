import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database['public']['Tables']['user_roles']['Row'];

export function useUserRole(userId: string | undefined) {
  return useQuery({
    queryKey: ["userRole", userId],
    queryFn: async () => {
      if (!userId) {
        console.log("No user ID provided to useUserRole");
        return null;
      }

      console.log("Fetching role for user:", userId);
      
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          throw error;
        }

        console.log("User role data:", data);
        return data as UserRole;
      } catch (error) {
        console.error("Error in useUserRole:", error);
        // Return null on error instead of a default role
        return null;
      }
    },
    enabled: !!userId, // Solo ejecutar la query si hay un userId
  });
}