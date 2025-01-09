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

const AdminPage = () => {
  const { user } = useAuth();
  const { data: userRole } = useGlobalRole(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Panel de Control</h1>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="courts">Canchas</TabsTrigger>
          <TabsTrigger value="statistics">Estadísticas</TabsTrigger>
          <TabsTrigger value="member-ids">IDs de Miembros</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        <TabsContent value="courts">
          <CourtManagement />
        </TabsContent>
        <TabsContent value="statistics">
          <Statistics />
        </TabsContent>
        <TabsContent value="member-ids">
          <ValidMemberIdManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;