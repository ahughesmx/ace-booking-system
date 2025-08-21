import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const sessionId = searchParams.get("session_id");
  const paypalPaymentId = searchParams.get("paymentId");
  const paypalPayerId = searchParams.get("PayerID");
  const paypalToken = searchParams.get("token");
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string>("");
  const [paymentType, setPaymentType] = useState<"stripe" | "paypal" | null>(null);

  // NEW: Direct Stripe payment verification - NO HOOKS
  const verifyStripePayment = async (stripeSessionId: string) => {
    try {
      console.log("🔥 NEW STRIPE PROCESS: Verifying payment directly:", stripeSessionId);
      
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      // Call verify-payment function directly
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId: stripeSessionId }
      });

      if (error) {
        console.error('❌ NEW STRIPE: Error from verify-payment:', error);
        throw new Error('Error al verificar el pago con Stripe');
      }

      if (data?.success) {
        console.log('✅ NEW STRIPE: Payment verified successfully');
        
        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({ queryKey: ["bookings"] });
        await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user.id] });
        
        // Show success toast
        toast({
          title: "¡Pago exitoso!",
          description: "Tu reserva ha sido confirmada correctamente.",
        });

        // Redirect to Reservas page
        console.log('🎯 NEW STRIPE: Redirecting to Reservas page');
        navigate("/", { state: { defaultTab: "bookings" }, replace: true });
        
        return true;
      } else {
        throw new Error(data?.message || 'No se pudo verificar el pago');
      }
    } catch (err) {
      console.error("❌ NEW STRIPE: Error in direct verification:", err);
      throw err;
    }
  };

  // PayPal verification (keeping existing for now)
  const verifyPayPalPayment = async (paymentId: string, payerId: string) => {
    try {
      console.log("🟡 PAYPAL: Processing payment:", { paymentId, payerId });
      
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      const { data, error } = await supabase.functions.invoke('verify-paypal-payment', {
        body: { paymentId, payerId }
      });

      if (error) {
        throw new Error('Error al verificar el pago con PayPal');
      }

      if (data?.success) {
        await queryClient.invalidateQueries({ queryKey: ["bookings"] });
        await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user.id] });
        
        toast({
          title: "¡Pago exitoso!",
          description: "Tu reserva ha sido confirmada correctamente.",
        });

        navigate("/", { state: { defaultTab: "bookings" }, replace: true });
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("❌ PAYPAL: Error:", err);
      throw err;
    }
  };

  useEffect(() => {
    const processPaymentReturn = async () => {
      try {
        // Determine payment type and process accordingly
        if (paypalPaymentId && paypalPayerId && paypalToken) {
          console.log("🟡 Detected PayPal return");
          setPaymentType("paypal");
          await verifyPayPalPayment(paypalPaymentId, paypalPayerId);
        } else if (sessionId) {
          console.log("🔥 Detected Stripe return - using NEW process");
          setPaymentType("stripe");
          await verifyStripePayment(sessionId);
        } else {
          setError("No se encontró información válida del pago");
        }
      } catch (err: any) {
        console.error("❌ Payment processing failed:", err);
        setError(err.message || "Error al procesar el pago");
      } finally {
        setIsProcessing(false);
      }
    };

    processPaymentReturn();
  }, [sessionId, paypalPaymentId, paypalPayerId, paypalToken, user?.id]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {paymentType === "stripe" ? "Verificando pago con Stripe..." : 
               paymentType === "paypal" ? "Verificando pago con PayPal..." : 
               "Procesando pago..."}
            </h2>
            <p className="text-muted-foreground text-center">
              Confirmando tu reserva, por favor espera...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              Error en el pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate("/")}
                className="flex-1"
              >
                Volver al inicio
              </Button>
              <Button 
                onClick={() => navigate("/", { state: { defaultTab: "bookings" } })}
                className="flex-1"
              >
                Ver mis reservas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This should never render because we redirect immediately on success
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            ¡Pago exitoso!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">
              Tu reserva ha sido confirmada
            </p>
            <p className="text-muted-foreground">
              Redirigiendo a tus reservas...
            </p>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="flex-1"
            >
              Ir al calendario
            </Button>
            <Button 
              onClick={() => navigate("/", { state: { defaultTab: "bookings" } })}
              className="flex-1"
            >
              Ver mis reservas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
