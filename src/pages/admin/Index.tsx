import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/use-user-role";
import UserManagement from "@/components/admin/UserManagement";
import CourtManagement from "@/components/admin/CourtManagement";
import Statistics from "@/components/admin/Statistics";
import ValidMemberIdManagement from "@/components/admin/ValidMemberIdManagement";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Users, Dumbbell, BarChart3, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const navigationItems = [
  { id: "users", label: "Usuarios", icon: Users },
  { id: "courts", label: "Canchas", icon: Dumbbell },
  { id: "stats", label: "Estadísticas", icon: BarChart3 },
  { id: "member-ids", label: "Claves de Socio", icon: Key },
];

export default function AdminIndex() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: userRole, isLoading: roleLoading, error: roleError } = useUserRole(user?.id);
  const [activeTab, setActiveTab] = useState("users");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAccess = async () => {
      // Si no hay usuario autenticado, redirigir al login
      if (!authLoading && !user) {
        console.log("No user found, redirecting to login");
        navigate("/login");
        return;
      }

      // Si hay error al cargar el rol, mostrar toast y redirigir
      if (roleError) {
        console.error("Error loading user role:", roleError);
        toast({
          title: "Error de acceso",
          description: "No se pudo verificar tus permisos de administrador",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Si el rol ya se cargó y no es admin, redirigir
      if (!roleLoading && userRole?.role !== 'admin') {
        console.log("User is not admin, redirecting");
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos de administrador",
          variant: "destructive",
        });
        navigate("/");
      }
    };

    checkAccess();
  }, [user, authLoading, roleLoading, userRole, roleError, navigate, toast]);

  // Mostrar estado de carga mientras se verifica la autenticación y el rol
  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  // Si no hay usuario o no es admin, no renderizar nada (el useEffect se encargará de la redirección)
  if (!user || userRole?.role !== 'admin') {
    return null;
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setMobileMenuOpen(false);
  };

  const NavItems = () => (
    <>
      {navigationItems.map((item) => (
        <Button
          key={item.id}
          variant={activeTab === item.id ? "default" : "ghost"}
          className="flex items-center gap-2 w-full justify-start"
          onClick={() => handleTabChange(item.id)}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
        </Button>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 border-b bg-background z-50">
        <div className="container mx-auto flex items-center justify-between px-4">
          <h1 className="text-xl font-bold">Panel de Administración</h1>
          <div className="flex items-center space-x-4">
            <NavItems />
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-background">
        <h1 className="text-xl font-bold">Panel de Administración</h1>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <div className="flex flex-col space-y-4 mt-8">
              <NavItems />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:pt-20">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
          <TabsContent value="courts" className="space-y-4">
            <CourtManagement />
          </TabsContent>
          <TabsContent value="stats" className="space-y-4">
            <Statistics />
          </TabsContent>
          <TabsContent value="member-ids" className="space-y-4">
            <ValidMemberIdManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}