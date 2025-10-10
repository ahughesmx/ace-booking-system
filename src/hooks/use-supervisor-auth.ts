import { useAuth } from "@/components/AuthProvider";
import { useGlobalRole } from "./use-global-role";

export function useSupervisorAuth() {
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useGlobalRole(user?.id);

  const isSupervisor = userRole?.role === 'supervisor' || userRole?.role === 'admin';
  const isLoading = authLoading || roleLoading;

  return {
    isSupervisor,
    isLoading,
    user,
    userRole
  };
}
