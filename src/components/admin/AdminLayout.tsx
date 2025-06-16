
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  Shield, 
  Monitor,
  Menu,
  LogOut,
  Home,
  Cog,
  FileText
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "users", label: "Usuarios", icon: Users },
  { id: "courts", label: "Canchas", icon: Calendar },
  { id: "court-settings", label: "Configurar Canchas", icon: Cog },
  { id: "booking-rules", label: "Reglas de Reserva", icon: Settings },
  { id: "member-ids", label: "IDs de Miembros", icon: Shield },
  { id: "statistics", label: "Estadísticas", icon: BarChart3 },
  { id: "booking-analysis", label: "Análisis de Reservas", icon: FileText },
  { id: "display", label: "Display Público", icon: Monitor },
];

export default function AdminLayout({ children, activeTab, onTabChange }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Panel de Control</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className={`w-full justify-start ${
                  activeTab === item.id
                    ? "bg-[#6898FE] text-white hover:bg-[#0FA0CE]"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => {
                  onTabChange(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-2">
        <Separator />
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-gray-100"
          onClick={() => navigate("/")}
        >
          <Home className="mr-3 h-4 w-4" />
          Volver al Inicio
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar para desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col h-full bg-white shadow-sm border-r">
          <SidebarContent />
        </div>
      </div>

      {/* Sidebar móvil */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
