import { ReactNode } from "react";
import MainNav from "@/components/MainNav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, FileBarChart } from "lucide-react";

interface SupervisorLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SupervisorLayout({ children, activeTab, onTabChange }: SupervisorLayoutProps) {
  const tabs = [
    { id: "users", label: "Gestión de Usuarios", icon: Users },
    { id: "reports", label: "Reportes", icon: FileBarChart },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Panel de Supervisor</h1>
          <p className="text-muted-foreground">
            Gestiona usuarios y revisa reportes de operadores
          </p>
        </div>

        {/* Mobile Navigation */}
        <div className="mb-6 md:hidden">
          <Select value={activeTab} onValueChange={onTabChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar sección" />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => (
                <SelectItem key={tab.id} value={tab.id}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
