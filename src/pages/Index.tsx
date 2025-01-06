import { useAuth } from "@/components/AuthProvider";
import BookingCalendar from "@/components/BookingCalendar";
import MatchManagement from "@/components/MatchManagement";
import RankingTable from "@/components/RankingTable";
import { useUserRole } from "@/hooks/use-user-role";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCircle2, Search, CircleDot, GraduationCap, Shield, Bell } from "lucide-react";
import MainNav from "@/components/MainNav";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

export default function Index() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: userRole } = useUserRole(user?.id);
  const defaultTab = location.state?.defaultTab;

  if (loading) {
    return <div>Cargando...</div>;
  }

  const handleNavigation = (tab: string) => {
    navigate("/", { state: { defaultTab: tab } });
  };

  const renderHomeCards = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Hola {user?.email?.split('@')[0] || 'Usuario'}
          <span className="ml-2" role="img" aria-label="wave">👋</span>
        </h1>
        <Bell className="h-6 w-6 text-[#1e3a8a]" />
      </div>

      <h2 className="text-2xl font-bold">Juega tu partido perfecto</h2>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => handleNavigation("bookings")} className="w-full text-left">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center">
                <Search className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold">Reserva una cancha</h3>
                <p className="text-gray-600 text-sm">Si ya sabes con quién vas a jugar</p>
              </div>
            </CardContent>
          </Card>
        </button>

        <button onClick={() => handleNavigation("matches")} className="w-full text-left">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center">
                <CircleDot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold">Registra un partido</h3>
                <p className="text-gray-600 text-sm">Si quieres rankear</p>
              </div>
            </CardContent>
          </Card>
        </button>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Clases</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Competencias</h3>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderContent = () => {
    // Mostrar la vista de tarjetas cuando no hay tab específico, independientemente del tamaño de pantalla
    if (!defaultTab) {
      return renderHomeCards();
    }

    switch (defaultTab) {
      case "bookings":
        return <BookingCalendar />;
      case "matches":
        return <MatchManagement />;
      case "ranking":
        return <RankingTable />;
      default:
        return renderHomeCards();
    }
  };

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
          {renderContent()}
        </div>
      </div>
    </div>
  );
}