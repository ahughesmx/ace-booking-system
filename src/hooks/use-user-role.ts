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
        return { role: 'user' } as UserRole;
      }

      console.log("Fetching role for user:", userId);
      
      try {
        const { data: userRole, error } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          throw error;
        }

        console.log("User role data:", userRole);

        return userRole || { role: 'user', user_id: userId } as UserRole;
      } catch (error) {
        console.error("Error in useUserRole:", error);
        throw error;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}