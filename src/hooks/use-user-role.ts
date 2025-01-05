import { useQuery } from "@tanstack/react-query";
import { handleSupabaseResponse, supabase } from "@/lib/supabase-client";
import type { Database } from "@/integrations/supabase/types";

type UserRoleRow = Database['public']['Tables']['user_roles']['Row'];
export type UserRole = UserRoleRow['role'];

export function useUserRole(userId: string | undefined) {
  return useQuery({
    queryKey: ['userRole', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      return handleSupabaseResponse<UserRoleRow>(
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single()
      );
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
    retryDelay: 1000,
  });
}