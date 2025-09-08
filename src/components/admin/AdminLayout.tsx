
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MainNav from "@/components/MainNav";
import {
  Users,
  Settings,
  BarChart3,
  Wrench,
  Calendar,
  Monitor,
  Webhook,
  UserPlus,
  CalendarCheck,
  CreditCard,
  Trophy,
  GraduationCap,
  Clock,
  Eye,
  FileText,
  CalendarClock,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AdminLayout({ children, activeTab, onTabChange }: AdminLayoutProps) {
  const tabs = [
    { id: "users", label: "Usuarios", icon: Users },
    { id: "registration-requests", label: "Solicitudes Registro", icon: UserPlus },
    { id: "courts", label: "Canchas", icon: Settings },
    { id: "court-settings", label: "Configuración Canchas", icon: Wrench },
    { id: "member-ids", label: "Membresías", icon: CreditCard },
    { id: "booking-rules", label: "Reglas de Reserva", icon: Calendar },
    { id: "rescheduling-rules", label: "Reagendamiento", icon: CalendarClock },
    { id: "special-bookings", label: "Reservas Especiales", icon: CalendarCheck },
    { id: "matches", label: "Partidos", icon: Trophy },
    { id: "academic", label: "Gestión Académica", icon: GraduationCap },
    { id: "statistics", label: "Estadísticas", icon: BarChart3 },
    { id: "display", label: "Display", icon: Monitor },
    { id: "webhooks", label: "Webhooks", icon: Webhook },
    { id: "payment-gateways", label: "Pasarelas de Pago", icon: CreditCard },
    { id: "expired-bookings", label: "Reservas Expiradas", icon: Clock },
    { id: "interface-preferences", label: "Preferencias de Interfaz", icon: Eye },
    { id: "legal-texts", label: "Textos Legales", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNav />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Control</h1>
          <p className="text-gray-600">Gestiona todos los aspectos del sistema</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Tabs */}
          <div className="lg:hidden">
            <Card>
              <CardContent className="p-4">
                <select
                  value={activeTab}
                  onChange={(e) => onTabChange(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white"
                >
                  {tabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "default" : "ghost"}
                        className={`w-full justify-start text-sm ${
                          activeTab === tab.id
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => onTabChange(tab.id)}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {tab.label}
                      </Button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Card>
              <CardContent className="p-6">
                {children}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
