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
        const { data, error } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user role:", error);
          throw error;
        }

        // If no role found, return default user role
        if (!data) {
          return { role: 'user', user_id: userId } as UserRole;
        }

        console.log("User role data:", data);
        return data;
      } catch (error) {
        console.error("Error in useUserRole:", error);
        // Return default role on error instead of throwing
        return { role: 'user', user_id: userId } as UserRole;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}