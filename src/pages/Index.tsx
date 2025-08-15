import React from "react";
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
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useHomeCardPreferences } from "@/hooks/use-interface-preferences";

export default function Index() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: userRole } = useUserRole(user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isCardEnabled, isLoading: cardsLoading } = useHomeCardPreferences();
  
  // Type the location state
  const locationState = location.state as { defaultTab?: string; selectedDate?: string } | null;
  const currentTab = locationState?.defaultTab;
  
  // Check if we're processing a payment return
  const urlParams = new URLSearchParams(location.search);
  const paymentStatus = urlParams.get('payment');
  const sessionId = urlParams.get('session_id');
  const isProcessingPayment = paymentStatus === 'success' && sessionId;
  const [paymentProcessed, setPaymentProcessed] = React.useState(false);

  // Handle payment success/failure immediately
  useEffect(() => {
    if (paymentStatus === 'success' && sessionId && !paymentProcessed) {
      setPaymentProcessed(true);
      
      // Verify payment and update booking
      const verifyPayment = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { sessionId }
          });

          if (error) throw error;

          if (data.success) {
            toast({
              title: "¡Pago exitoso!",
              description: "Tu reserva ha sido confirmada correctamente.",
            });
            
            // Invalidate queries to refresh booking data
            await queryClient.invalidateQueries({ queryKey: ["bookings"] });
            await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user?.id] });
            await queryClient.invalidateQueries({ queryKey: ["active-bookings", user?.id] });
            
            // Extract the selected date from booking data if available
            let navigationState: any = { defaultTab: "bookings" };
            if (data.bookingData && data.bookingData.selectedDate) {
              navigationState = {
                ...navigationState,
                selectedDate: data.bookingData.selectedDate
              };
            }
            
            // Navigate to bookings tab with the original selected date
            navigate("/", { state: navigationState, replace: true });
          } else {
            toast({
              title: "Error verificando pago",
              description: data.message || "No se pudo verificar el pago.",
              variant: "destructive",
            });
            navigate("/", { state: { defaultTab: "bookings" }, replace: true });
          }
        } catch (error) {
          console.error("Error verifying payment:", error);
          toast({
            title: "Error verificando pago",
            description: "Hubo un problema verificando tu pago. Contacta soporte.",
            variant: "destructive",
          });
          navigate("/", { state: { defaultTab: "bookings" }, replace: true });
        }
      };

      verifyPayment();
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Pago cancelado",
        description: "El pago fue cancelado. Puedes intentar nuevamente.",
        variant: "destructive",
      });
      // Navigate to bookings tab
      navigate("/", { state: { defaultTab: "bookings" }, replace: true });
    }
  }, [paymentStatus, sessionId, paymentProcessed, user?.id, toast, queryClient, navigate]);

  console.log('🐛 Index.tsx - Debug states:', { loading, isProcessingPayment, cardsLoading, currentTab });
  if (loading || isProcessingPayment || cardsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl font-semibold text-[#1e3a8a]">
            {loading ? "Cargando..." : "Procesando pago..."}
          </div>
          {isProcessingPayment && (
            <div className="text-sm text-[#6898FE]/70">
              Verificando tu reserva, por favor espera.
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleNavigation = (tab: string) => {
    navigate("/", { state: { defaultTab: tab }, replace: true });
  };

  const renderHomeCards = () => {
    console.log('🐛 renderHomeCards called - isCardEnabled results:');
    console.log('  - home_card_matches:', isCardEnabled("home_card_matches"));
    console.log('  - home_card_courses:', isCardEnabled("home_card_courses"));
    console.log('  - home_card_competitions:', isCardEnabled("home_card_competitions"));
    
    return (
      <div className="animate-fade-in">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#3b82f6] rounded-3xl p-8 md:p-12 mb-8 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 border border-white/30 rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-24 h-24 border border-white/30 rounded-full"></div>
            <div className="absolute top-1/2 right-1/4 w-16 h-16 border border-white/30 rounded-full"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10 text-white text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Hola {user?.email?.split('@')[0] || 'Usuario'} 
              <span className="ml-3" role="img" aria-label="wave">👋</span>
            </h1>
            
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-6">
              Juega tu partido perfecto
            </h2>
            
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Reserva tu cancha en segundos y vive la experiencia al máximo.
            </p>
            
            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto">
              <button 
                onClick={() => handleNavigation("bookings")}
                className="w-full sm:w-auto bg-white text-[#1e3a8a] hover:bg-white/90 font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Buscar canchas disponibles
              </button>
              
              <button 
                onClick={() => handleNavigation("bookings")}
                className="w-full sm:w-auto bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 hover:bg-white/20 font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Ver mis reservas
              </button>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-6">
            <div className="bg-[#1e3a8a] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Search className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#1e3a8a] mb-2">Ver disponibilidad</h3>
            <p className="text-[#6898FE]/70 text-sm">Encuentra canchas libres al instante</p>
          </div>
          
          {isCardEnabled("home_card_matches") && (
            <div className="text-center p-6">
              <div className="bg-[#1e3a8a] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CircleDot className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#1e3a8a] mb-2">Mis deportes</h3>
              <p className="text-[#6898FE]/70 text-sm">Registra partidos y mejora tu ranking</p>
            </div>
          )}
          
          <div className="text-center p-6">
            <div className="bg-[#1e3a8a] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <UserCircle2 className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#1e3a8a] mb-2">Canchas cercanas</h3>
            <p className="text-[#6898FE]/70 text-sm">Encuentra las mejores opciones cerca</p>
          </div>
        </div>

        {/* Additional Cards for enabled features */}
        {(isCardEnabled("home_card_courses") || isCardEnabled("home_card_competitions")) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isCardEnabled("home_card_courses") && (
              <button onClick={() => navigate("/courses")} className="w-full text-left hover-scale">
                <Card className="hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5 h-full">
                  <CardContent className="p-6">
                    <div className="bg-[#1e3a8a] w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE] mb-2">
                      Clases y cursos
                    </h3>
                    <p className="text-sm text-[#6898FE]/70">Conoce horarios, días y deportes que puedes aprender</p>
                  </CardContent>
                </Card>
              </button>
            )}

            {isCardEnabled("home_card_competitions") && (
              <div className="hover-scale">
                <Card className="hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5 h-full">
                  <CardContent className="p-6">
                    <div className="bg-[#1e3a8a] w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE] mb-2">
                      Competencias
                    </h3>
                    <p className="text-sm text-[#6898FE]/70">Participa en torneos y competencias</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    );
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
          {currentTab === "bookings" && (
            <div key="bookings-wrapper" style={{ minHeight: '500px' }}>
              <BookingCalendar selectedDate={locationState?.selectedDate} />
            </div>
          )}
          
          {currentTab === "matches" && (
            <div key="matches-wrapper">
              <MatchManagement />
            </div>
          )}
          
          {currentTab === "ranking" && (
            <div key="ranking-wrapper">
              <RankingTable />
            </div>
          )}
          
          {!currentTab && renderHomeCards()}
        </div>
      </div>
    </div>
  );
}