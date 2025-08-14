import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useGlobalRole } from "@/hooks/use-global-role";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import RegistrationRequests from "@/components/admin/RegistrationRequests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MainNav from "@/components/MainNav";

const OperatorPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useGlobalRole(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isOperator = userRole?.role === 'operador';
  const isLoading = authLoading || roleLoading;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      toast({
        title: "Acceso denegado",
        description: "Debes iniciar sesión para acceder a esta página",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!isOperator) {
      toast({
        title: "Acceso denegado", 
        description: "No tienes permisos de operador",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
  }, [user, isOperator, isLoading, navigate, toast]);

  // Show loading while verifying operator access
  if (isLoading || !isOperator) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Verificando permisos de operador...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MainNav />
      <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Operador</h1>
          <p className="text-muted-foreground">
            Gestiona las solicitudes de registro de nuevos usuarios
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Registro</CardTitle>
          <CardDescription>
            Revisa y procesa las solicitudes de nuevos usuarios para el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationRequests />
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default OperatorPage;