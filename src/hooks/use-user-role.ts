import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database['public']['Tables']['user_roles']['Row'];

export function useUserRole(userId: string | undefined) {
  console.log("useUserRole hook called with userId:", userId);
  console.log("Current Supabase URL:", supabase.supabaseUrl);
  
  return useQuery({
    queryKey: ["userRole", userId],
    queryFn: async () => {
      if (!userId) {
        console.log("No user ID provided to useUserRole");
        return null;
      }

      console.log("Fetching role for user:", userId);
      console.log("Supabase client config:", {
        url: supabase.supabaseUrl,
        hasAuth: !!supabase.auth,
      });
      
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
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos (reemplaza cacheTime)
    retry: 1,
  });
}