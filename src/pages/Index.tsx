
import React, { useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BookingCalendar } from "@/components/BookingCalendar";
import MatchManagement from "@/components/MatchManagement";
import RankingTable from "@/components/RankingTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCircle2, Search, CircleDot, GraduationCap, Shield } from "lucide-react";
import MainNav from "@/components/MainNav";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useUserRole } from "@/hooks/use-user-role";

export default function Index() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: userRole } = useUserRole(user?.id);
  
  const currentTab = location.state?.defaultTab;

  if (loading) {
    return <div>Cargando...</div>;
  }

  const handleNavigation = (tab: string) => {
    navigate("/", { state: { defaultTab: tab }, replace: true });
  };

  const renderHomeCards = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#1e3a8a]">
          Hola {user?.email?.split('@')[0] || 'Usuario'}
          <span className="ml-2 text-[#1e3a8a]" role="img" aria-label="wave">👋</span>
        </h1>
      </div>

      <h2 className="text-2xl font-bold text-[#1e3a8a]">
        Juega tu partido perfecto
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => handleNavigation("bookings")} className="w-full text-left">
          <Card className="hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5">
            <CardContent className="p-4">
              <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center mb-2">
                <Search className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
                Reserva cancha
              </h3>
              <p className="text-sm text-[#6898FE]/70">Canchas disponibles</p>
            </CardContent>
          </Card>
        </button>

        <button onClick={() => handleNavigation("matches")} className="w-full text-left">
          <Card className="hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5">
            <CardContent className="p-4">
              <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center mb-2">
                <CircleDot className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
                Registra un partido
              </h3>
              <p className="text-sm text-[#6898FE]/70">Si quieres rankear tu posición</p>
            </CardContent>
          </Card>
        </button>

        <Card className="hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5">
          <CardContent className="p-4">
            <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center mb-2">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
              Clases
            </h3>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5">
          <CardContent className="p-4">
            <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
              Competencias
            </h3>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderContent = useMemo(() => {
    switch (currentTab) {
      case "bookings":
        return <BookingCalendar />;
      case "matches":
        return <MatchManagement />;
      case "ranking":
        return <RankingTable />;
      default:
        return renderHomeCards();
    }
  }, [currentTab, user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <MainNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {userRole?.role === 'admin' && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <UserCircle2 className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-700">
              Acceso de administrador activado
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mt-6 space-y-6 mx-auto max-w-4xl">
          {renderContent}
        </div>
      </div>
    </div>
  );
}
