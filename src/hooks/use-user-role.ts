import { useQuery } from "@tanstack/react-query";
import { handleSupabaseResponse, supabase } from "@/lib/supabase-client";

export type UserRole = 'admin' | 'moderator' | 'user';

export function useUserRole(userId: string | undefined) {
  return useQuery({
    queryKey: ['userRole', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      return handleSupabaseResponse(
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