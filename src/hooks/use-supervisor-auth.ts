import { useAuth } from "@/components/AuthProvider";
import { useGlobalRole } from "./use-global-role";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./use-toast";

export function useSupervisorAuth() {
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useGlobalRole(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isSupervisor = userRole?.role === 'supervisor' || userRole?.role === 'admin';
  const isLoading = authLoading || roleLoading;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      toast({
        title: "Acceso denegado",
        description: "Debes iniciar sesión para acceder al panel de supervisor",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!isSupervisor) {
      toast({
        title: "Acceso denegado", 
        description: "No tienes permisos de supervisor",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
  }, [user, isSupervisor, isLoading, navigate, toast]);

  return {
    isSupervisor,
    isLoading,
    user,
    userRole
  };
}
