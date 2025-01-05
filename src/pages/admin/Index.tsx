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

const navigationItems = [
  { id: "users", label: "Usuarios", icon: Users },
  { id: "courts", label: "Canchas", icon: Dumbbell },
  { id: "stats", label: "Estadísticas", icon: BarChart3 },
  { id: "member-ids", label: "Claves de Socio", icon: Key },
];

export default function AdminIndex() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: userRole, isLoading: roleLoading } = useUserRole(user?.id);
  const [activeTab, setActiveTab] = useState("users");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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