import { ReactNode } from "react";
import MainNav from "@/components/MainNav";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileBarChart, Calendar } from "lucide-react";

interface SupervisorLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SupervisorLayout({ children, activeTab, onTabChange }: SupervisorLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Panel de Supervisor</h1>
          <p className="text-muted-foreground">
            Gestiona usuarios, reservas y revisa reportes de operadores
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="w-full md:w-auto mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gestión de Usuarios
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Reservas
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4" />
              Reportes
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {children}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
