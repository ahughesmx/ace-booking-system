
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Clock, GraduationCap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainNav from "@/components/MainNav";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleReserveClick = () => {
    navigate("/bookings");
  };

  const handleMatchClick = () => {
    navigate("/matches");
  };

  const handleRankingClick = () => {
    navigate("/ranking");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <MainNav />
      <div className="container mx-auto pt-24 pb-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-[#1e3a8a]">
              Hola {user ? user.email?.split('@')[0] : 'Usuario'} 👋
            </h1>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-700">
              Juega tu partido perfecto
            </h2>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reserva una cancha */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-white"
              onClick={handleReserveClick}
            >
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 bg-[#1e3a8a] rounded-lg flex items-center justify-center">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#6898FE] mb-2">
                    Reserva una cancha
                  </h3>
                  <p className="text-sm text-gray-600">
                    Si ya sabes con quien vas a jugar
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Registra un partido */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-white"
              onClick={handleMatchClick}
            >
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 bg-[#1e3a8a] rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#6898FE] mb-2">
                    Registra un partido
                  </h3>
                  <p className="text-sm text-gray-600">
                    Si quieres rankear tu posición
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Clases */}
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 bg-[#1e3a8a] rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#6898FE] mb-2">
                    Clases
                  </h3>
                  <p className="text-sm text-gray-600">
                    Próximamente disponible
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Competencias */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-white"
              onClick={handleRankingClick}
            >
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 bg-[#1e3a8a] rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#6898FE] mb-2">
                    Competencias
                  </h3>
                  <p className="text-sm text-gray-600">
                    Ver ranking y competencias
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
