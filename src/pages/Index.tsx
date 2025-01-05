import { useAuth } from "@/components/AuthProvider";
import BookingCalendar from "@/components/BookingCalendar";
import MatchManagement from "@/components/MatchManagement";
import RankingTable from "@/components/RankingTable";
import { useUserRole } from "@/hooks/use-user-role";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCircle2, Search, CircleDot, GraduationCap, Shield, Home, Users, User, Bell } from "lucide-react";
import MainNav from "@/components/MainNav";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function Index() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: userRole } = useUserRole(user?.id);
  const defaultTab = location.state?.defaultTab || "bookings";

  if (loading) {
    return <div>Cargando...</div>;
  }

  const renderMobileHome = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Hola {user?.email?.split('@')[0] || 'Usuario'}
          <span className="ml-2" role="img" aria-label="wave">👋</span>
        </h1>
        <Bell className="h-6 w-6" />
      </div>

      <h2 className="text-2xl font-bold">Juega tu partido perfecto</h2>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/" state={{ defaultTab: "bookings" }}>
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardContent className="p-4">
              <div className="bg-[#0A1A2A] w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                <Search className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-bold mb-1">Reserva una cancha</h3>
              <p className="text-gray-600 text-sm">Si ya sabes con quién vas a jugar</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/" state={{ defaultTab: "matches" }}>
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardContent className="p-4">
              <div className="bg-[#0A1A2A] w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                <CircleDot className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-bold mb-1">Únete a un partido</h3>
              <p className="text-gray-600 text-sm">Si buscas otros jugadores</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-lg transition-shadow h-full">
          <CardContent className="p-4">
            <div className="bg-[#0A1A2A] w-10 h-10 rounded-lg flex items-center justify-center mb-3">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-bold mb-1">Clases</h3>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow h-full">
          <CardContent className="p-4">
            <div className="bg-[#0A1A2A] w-10 h-10 rounded-lg flex items-center justify-center mb-3">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-bold mb-1">Competencias</h3>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold">Clubes</h2>
        <div className="grid grid-cols-1 gap-4 mt-4">
          <img 
            src="/lovable-uploads/cb20a440-8fe0-48ba-a91f-3943cb74ae55.png" 
            alt="Club de tenis" 
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    // En dispositivos móviles, siempre mostrar la vista principal
    if (window.innerWidth < 768) {
      return renderMobileHome();
    }

    // En desktop, mantener la lógica existente
    switch (defaultTab) {
      case "bookings":
        return <BookingCalendar />;
      case "matches":
        return <MatchManagement />;
      case "ranking":
        return <RankingTable />;
      default:
        return <BookingCalendar />;
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