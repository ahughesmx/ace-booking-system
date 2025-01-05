import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'moderator' | 'user';

export function useUserRole(userId: string | undefined) {
  return useQuery({
    queryKey: ['userRole', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as UserRole;
    },
    enabled: !!userId,
    retry: 1, // Reducimos a 1 solo reintento
    retryDelay: 1000, // Esperamos 1 segundo antes de reintentar
  });
}