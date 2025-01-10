import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Users,
  LayoutGrid,
  BarChart3,
  IdCard,
  CalendarRange,
  Monitor,
  Home,
  LogOut,
  Menu,
} from "lucide-react";

const menuItems = [
  {
    title: "Usuarios",
    icon: Users,
    id: "users",
  },
  {
    title: "Canchas",
    icon: LayoutGrid,
    id: "courts",
  },
  {
    title: "Estadísticas",
    icon: BarChart3,
    id: "statistics",
  },
  {
    title: "IDs de Miembros",
    icon: IdCard,
    id: "member-ids",
  },
  {
    title: "Reglas de Reserva",
    icon: CalendarRange,
    id: "booking-rules",
  },
  {
    title: "Display",
    icon: Monitor,
    id: "display",
  },
];

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

function AdminLayoutContent({ children, activeTab, onTabChange }: AdminLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleHomeClick = () => {
    setOpenMobile(false);
    navigate("/");
  };

  const handleTabChange = (tabId: string) => {
    setOpenMobile(false);
    onTabChange(tabId);
  };

  return (
    <div className="min-h-screen flex w-full bg-gray-50/50">
      {/* Botón de menú móvil fijo en la parte superior */}
      <div className="fixed top-0 left-0 z-50 w-full bg-white border-b md:hidden">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-semibold">Panel de Control</h1>
          <SidebarTrigger className="p-2">
            <Menu className="h-6 w-6" />
          </SidebarTrigger>
        </div>
      </div>

      <Sidebar className="border-r">
        <SidebarHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold hidden md:block">Panel de Control</h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Gestión</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full justify-start gap-2 ${
                        activeTab === item.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-4">
          <div className="flex gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={handleHomeClick}
              className="w-full gap-2"
            >
              <Home className="h-4 w-4" />
              <span>Inicio</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full gap-2 text-red-600 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Salir</span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 overflow-y-auto pt-[72px] md:pt-0">
        <div className="container max-w-6xl py-6 px-4 md:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout(props: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <AdminLayoutContent {...props} />
    </SidebarProvider>
  );
}