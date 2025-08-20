import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBookingPayment } from "@/components/booking/useBookingPayment";

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string>("");
  const { confirmPaymentSuccess } = useBookingPayment();

  useEffect(() => {
    const processPaymentSuccess = async () => {
      if (!sessionId) {
        setError("No se encontró información de la sesión de pago");
        setIsProcessing(false);
        return;
      }

      try {
        console.log("🎉 Processing payment success for session:", sessionId);
        const success = await confirmPaymentSuccess();
        
        if (success) {
          console.log("✅ Payment confirmed successfully");
        } else {
          setError("Error al confirmar el pago");
        }
      } catch (err) {
        console.error("❌ Error processing payment success:", err);
        setError("Error al procesar la confirmación del pago");
      } finally {
        setIsProcessing(false);
      }
    };

    processPaymentSuccess();
  }, [sessionId, confirmPaymentSuccess]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Procesando pago...</h2>
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
                onClick={() => navigate("/my-bookings")}
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
              Recibirás una confirmación y podrás ver los detalles en tu sección de reservas.
            </p>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="flex-1"
            >
              Volver al inicio
            </Button>
            <Button 
              onClick={() => navigate("/my-bookings")}
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