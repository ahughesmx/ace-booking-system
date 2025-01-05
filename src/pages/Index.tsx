import { useAuth } from "@/components/AuthProvider";
import BookingCalendar from "@/components/BookingCalendar";
import MatchManagement from "@/components/MatchManagement";
import RankingTable from "@/components/RankingTable";
import { useUserRole } from "@/hooks/use-user-role";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCircle2, Search, TennisBall, GraduationCap, Shield, Home, Users, User, Bell } from "lucide-react";
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Hola {user?.email?.split('@')[0] || 'Usuario'}
          <span className="ml-2" role="img" aria-label="wave">👋</span>
        </h1>
        <Bell className="h-6 w-6" />
      </div>

      <h2 className="text-2xl font-bold">Juega tu partido perfecto</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/" state={{ defaultTab: "bookings" }}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="bg-[#0A1A2A] w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Reserva una cancha</h3>
              <p className="text-gray-600">Si ya sabes con quién vas a jugar</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/" state={{ defaultTab: "matches" }}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="bg-[#0A1A2A] w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <TennisBall className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Únete a un partido abierto</h3>
              <p className="text-gray-600">Si buscas otros jugadores</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="bg-[#0A1A2A] w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Clases</h3>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="bg-[#0A1A2A] w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Competencias</h3>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Clubes</h2>
        <div className="grid grid-cols-1 gap-4">
          <img 
            src="/lovable-uploads/cb20a440-8fe0-48ba-a91f-3943cb74ae55.png" 
            alt="Club de tenis" 
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-around items-center">
            <Link to="/" className="flex flex-col items-center text-blue-600">
              <Home className="h-6 w-6" />
              <span className="text-xs mt-1">Inicio</span>
            </Link>
            <Link to="/" className="flex flex-col items-center text-gray-500">
              <Users className="h-6 w-6" />
              <span className="text-xs mt-1">Comunidad</span>
            </Link>
            <Link to="/" className="flex flex-col items-center text-gray-500">
              <User className="h-6 w-6" />
              <span className="text-xs mt-1">Perfil</span>
            </Link>
          </div>
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