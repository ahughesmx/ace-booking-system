
import { useAuth } from "@/components/AuthProvider";
import { useGlobalRole } from "./use-global-role";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./use-toast";

export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useGlobalRole(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isAdmin = userRole?.role === 'admin' || userRole?.role === 'operador';
  const isLoading = authLoading || roleLoading;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      toast({
        title: "Acceso denegado",
        description: "Debes iniciar sesión para acceder al panel de control",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!isAdmin) {
      toast({
        title: "Acceso denegado", 
        description: "No tienes permisos de administrador u operador",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
  }, [user, isAdmin, isLoading, navigate, toast]);

  return {
    isAdmin,
    isLoading,
    user,
    userRole
  };
}
