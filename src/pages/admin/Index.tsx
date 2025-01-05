import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/use-user-role";
import UserManagement from "@/components/admin/UserManagement";
import CourtManagement from "@/components/admin/CourtManagement";
import Statistics from "@/components/admin/Statistics";

export default function AdminIndex() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: userRole, isLoading: roleLoading } = useUserRole(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!roleLoading && userRole?.role !== 'admin') {
      navigate("/");
    }
  }, [userRole, roleLoading, navigate]);

  if (loading || roleLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="courts">Canchas</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>
        <TabsContent value="courts" className="space-y-4">
          <CourtManagement />
        </TabsContent>
        <TabsContent value="stats" className="space-y-4">
          <Statistics />
        </TabsContent>
      </Tabs>
    </div>
  );
}