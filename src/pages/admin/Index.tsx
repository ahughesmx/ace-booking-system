import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalRole } from "@/hooks/use-global-role";
import { useAuth } from "@/components/AuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from "@/components/admin/UserManagement";
import CourtManagement from "@/components/admin/CourtManagement";
import Statistics from "@/components/admin/Statistics";
import ValidMemberIdManagement from "@/components/admin/ValidMemberIdManagement";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const AdminPage = () => {
  const { user } = useAuth();
  const { data: userRole } = useGlobalRole(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Si el usuario no está autenticado, redirigir al inicio
    if (!user) {
      navigate("/");
      return;
    }

    // Verificar el rol después de que se cargue
    if (userRole && userRole.role !== "admin") {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para acceder al panel de control",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, userRole, navigate, toast]);

  // Si el usuario no está autenticado o no es admin, no renderizar nada
  if (!user || (userRole && userRole.role !== "admin")) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 md:py-6 max-w-full md:max-w-7xl">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Panel de Control</h1>
      <Tabs defaultValue="users" className="w-full">
        <TabsList className={`w-full ${isMobile ? 'grid grid-cols-2 gap-2' : 'flex'} mb-4`}>
          <TabsTrigger value="users" className="flex-1">Usuarios</TabsTrigger>
          <TabsTrigger value="courts" className="flex-1">Canchas</TabsTrigger>
          <TabsTrigger value="statistics" className="flex-1">Estadísticas</TabsTrigger>
          <TabsTrigger value="member-ids" className="flex-1">IDs de Miembros</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
          <TabsContent value="courts" className="space-y-4">
            <CourtManagement />
          </TabsContent>
          <TabsContent value="statistics" className="space-y-4">
            <Statistics />
          </TabsContent>
          <TabsContent value="member-ids" className="space-y-4">
            <ValidMemberIdManagement />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminPage;