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
import { HomeQuickActions } from "@/components/HomeQuickActions";

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
    // Calculate enabled cards to determine grid layout
    const enabledCards = [
      { id: "bookings", enabled: true }, // Always enabled
      { id: "matches", enabled: isCardEnabled("home_card_matches") },
      { id: "courses", enabled: isCardEnabled("home_card_courses") },
      { id: "competitions", enabled: isCardEnabled("home_card_competitions") }
    ].filter(card => card.enabled);

    const enabledCount = enabledCards.length;
    
    // Dynamic grid classes based on number of enabled cards
    const getGridClass = () => {
      if (enabledCount === 1) return "grid-cols-1 max-w-sm mx-auto";
      if (enabledCount === 2) return "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto";
      if (enabledCount === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto";
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 max-w-6xl mx-auto";
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e3a8a]">
            Hola {user?.email?.split('@')[0] || 'Usuario'}
            <span className="ml-2 text-[#1e3a8a]" role="img" aria-label="wave">👋</span>
          </h1>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-[#1e3a8a] text-left">
          Juega tu partido perfecto
        </h2>

        <div className={`grid ${getGridClass()} gap-4`}>
          <button onClick={() => handleNavigation("bookings")} className="w-full text-left hover-scale">
            <Card className="hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5 h-full min-h-[120px]">
              <CardContent className="p-4 sm:p-6">
                <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE] mb-1">
                  Reserva cancha
                </h3>
                <p className="text-sm text-[#6898FE]/70">Canchas disponibles</p>
              </CardContent>
            </Card>
          </button>

          {isCardEnabled("home_card_matches") && (
            <button onClick={() => handleNavigation("matches")} className="w-full text-left hover-scale">
              <Card className="hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5 h-full min-h-[120px]">
                <CardContent className="p-4 sm:p-6">
                  <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                    <CircleDot className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE] mb-1">
                    Registra un partido
                  </h3>
                  <p className="text-sm text-[#6898FE]/70">Si quieres rankear tu posición</p>
                </CardContent>
              </Card>
            </button>
          )}

          {isCardEnabled("home_card_courses") && (
            <button onClick={() => navigate("/courses")} className="w-full text-left hover-scale">
              <Card className="hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5 cursor-pointer h-full min-h-[120px]">
                <CardContent className="p-4 sm:p-6">
                  <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE] mb-1">
                    Clases y cursos
                  </h3>
                  <p className="text-sm text-[#6898FE]/70">Conoce horarios, días y deportes que puedes aprender</p>
                </CardContent>
              </Card>
            </button>
          )}

          {isCardEnabled("home_card_competitions") && (
            <div className="hover-scale">
              <Card className="hover:shadow-lg transition-all duration-300 border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5 h-full min-h-[120px]">
                <CardContent className="p-4 sm:p-6">
                  <div className="bg-[#1e3a8a] w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
                    Competencias
                  </h3>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        
        {/* Quick Actions */}
        <HomeQuickActions onNavigateToBookings={() => navigate("/my-bookings")} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MainNav />
      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        {userRole?.role === 'admin' && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <UserCircle2 className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-700">
              Acceso de administrador activado
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mt-4 sm:mt-6 space-y-6 mx-auto max-w-4xl">
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