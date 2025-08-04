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

export default function Index() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: userRole } = useUserRole(user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const currentTab = location.state?.defaultTab;
  
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
            
            // Navigate to bookings tab immediately
            navigate("/", { state: { defaultTab: "bookings" }, replace: true });
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

  if (loading || isProcessingPayment) {
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
              <BookingCalendar />
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