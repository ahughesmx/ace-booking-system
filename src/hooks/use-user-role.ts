import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database['public']['Tables']['user_roles']['Row'];

export function useUserRole(userId: string | undefined) {
  return useQuery({
    queryKey: ["userRole", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");

      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      // Si no hay rol asignado, devolvemos el rol por defecto 'user'
      return data || { role: 'user' } as UserRole;
    },
    enabled: !!userId,
    retry: 1,
  });
}