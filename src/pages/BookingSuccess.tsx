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
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const sessionId = searchParams.get("session_id");
  const paypalToken = searchParams.get("token"); // PayPal v2 uses "token" parameter for order ID
  const paypalPaymentId = paypalToken; // For backward compatibility
  const paypalPayerId = searchParams.get("PayerID"); // Not used in v2 but keeping for fallback
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>("");
  const [paymentType, setPaymentType] = useState<"stripe" | "paypal" | null>(null);

  // Simplified Stripe payment verification
  const verifyStripePayment = async (stripeSessionId: string) => {
    try {
      console.log("🔥 Verifying Stripe payment:", stripeSessionId);
      
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId: stripeSessionId }
      });

      if (error) {
        console.error('❌ Error from verify-payment:', error);
        throw new Error('El pago no se pudo completar. Por favor, intenta nuevamente.');
      }

      if (data?.success) {
        console.log('✅ Payment verified successfully');
        setSuccess(true);
        
        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({ queryKey: ["bookings"] });
        await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user.id] });
        
        // Redirect immediately to Reservas page
        setTimeout(() => {
          navigate("/", { state: { defaultTab: "bookings" }, replace: true });
        }, 1500);
        
        return true;
      } else {
        throw new Error('El pago no se pudo completar. Por favor, intenta nuevamente.');
      }
    } catch (err) {
      console.error("❌ Error in payment verification:", err);
      throw err;
    }
  };

  // PayPal verification
  const verifyPayPalPayment = async (orderId: string) => {
    try {
      console.log("🟡 Processing PayPal payment with order ID:", orderId);
      
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      const { data, error } = await supabase.functions.invoke('verify-paypal-payment', {
        body: { paymentId: orderId }
      });

      if (error) {
        throw new Error('El pago no se pudo completar. Por favor, intenta nuevamente.');
      }

      if (data?.success) {
        setSuccess(true);
        await queryClient.invalidateQueries({ queryKey: ["bookings"] });
        await queryClient.invalidateQueries({ queryKey: ["userActiveBookings", user.id] });
        
        setTimeout(() => {
          navigate("/", { state: { defaultTab: "bookings" }, replace: true });
        }, 1500);
        
        return true;
      }
      
      throw new Error('El pago no se pudo completar. Por favor, intenta nuevamente.');
    } catch (err) {
      console.error("❌ PayPal Error:", err);
      throw err;
    }
  };

  useEffect(() => {
    // No procesar pago hasta que la autenticación esté completa
    if (authLoading) {
      return;
    }

    const processPaymentReturn = async () => {
      try {
        if (paypalToken) {
          console.log("🟡 Detected PayPal return with token:", paypalToken);
          setPaymentType("paypal");
          await verifyPayPalPayment(paypalToken);
        } else if (sessionId) {
          console.log("🔥 Detected Stripe return");
          setPaymentType("stripe");
          await verifyStripePayment(sessionId);
        } else {
          setError("No se encontró información válida del pago");
        }
      } catch (err: any) {
        console.error("❌ Payment processing failed:", err);
        setError(err.message || "El pago no se pudo completar. Por favor, intenta nuevamente.");
      } finally {
        setIsProcessing(false);
      }
    };

    processPaymentReturn();
  }, [sessionId, paypalToken, user?.id, authLoading]);

  if (isProcessing || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {authLoading ? "Procesando pago..." :
               paymentType === "stripe" ? "Verificando pago con Stripe..." : 
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

  if (success) {
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
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-destructive mb-2">
                Error en el pago
              </h2>
              <p className="text-muted-foreground">
                {error}
              </p>
              <Button 
                onClick={() => navigate('/')} 
                className="mt-4"
              >
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback - should not render
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Procesando...</h2>
        </CardContent>
      </Card>
    </div>
  );
}
