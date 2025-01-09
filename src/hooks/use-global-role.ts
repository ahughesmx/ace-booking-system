import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database['public']['Tables']['user_roles']['Row'];

export function useGlobalRole(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["globalUserRole", userId],
    queryFn: async () => {
      if (!userId) {
        console.log("useGlobalRole: No user ID provided");
        return null;
      }

      console.log("useGlobalRole: Fetching role for user:", userId);
      
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error) {
          console.error("useGlobalRole: Error fetching user role:", error);
          throw error;
        }

        console.log("useGlobalRole: Role data:", data);
        return data as UserRole;
      } catch (error) {
        console.error("useGlobalRole: Error:", error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
}