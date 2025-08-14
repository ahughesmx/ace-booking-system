import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ExpiredBookingsManager() {
  const [processing, setProcessing] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: expiredBookings = [], isLoading } = useQuery({
    queryKey: ["expired-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          court:courts(name, court_type),
          user:profiles(full_name, member_id)
        `)
        .eq("status", "pending_payment")
        .lt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const markAsPaidCash = async (bookingId: string) => {
    setProcessing(bookingId);
    try {
      // Crear número de folio
      const { data: receiptData, error: receiptError } = await supabase
        .rpc('create_receipt_number', { p_booking_id: bookingId });

      if (receiptError) {
        console.error('Error creating receipt:', receiptError);
        throw new Error('Error al crear folio de recibo');
      }

      // Actualizar booking a pagado
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status: 'paid',
          payment_method: 'cash',
          payment_gateway: 'efectivo',
          payment_completed_at: new Date().toISOString(),
          payment_id: `cash_${Date.now()}`,
          actual_amount_charged: 200, // Usar el amount original
          expires_at: null
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      toast({
        title: "Reserva rescatada",
        description: `Reserva marcada como pagada en efectivo. Folio: ${receiptData}`,
      });

      queryClient.invalidateQueries({ queryKey: ["expired-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast({
        title: "Error",
        description: "No se pudo marcar la reserva como pagada",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const deleteExpiredBooking = async (bookingId: string) => {
    setProcessing(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Reserva eliminada",
        description: "La reserva expirada ha sido eliminada",
      });

      queryClient.invalidateQueries({ queryKey: ["expired-bookings"] });
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la reserva",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  if (isLoading) {
    return <div>Cargando reservas expiradas...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservas Expiradas - Gestión</CardTitle>
      </CardHeader>
      <CardContent>
        {expiredBookings.length === 0 ? (
          <p>No hay reservas expiradas</p>
        ) : (
          <div className="space-y-4">
            {expiredBookings.map((booking) => (
              <div key={booking.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">
                      {booking.user?.full_name} ({booking.user?.member_id})
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {booking.court?.name} - {booking.court?.court_type}
                    </p>
                    <p className="text-sm">
                      {format(new Date(booking.start_time), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                    <p className="text-sm">Monto: ${booking.amount}</p>
                  </div>
                  <Badge variant="destructive">Expirada</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => markAsPaidCash(booking.id)}
                    disabled={processing === booking.id}
                  >
                    {processing === booking.id ? "Procesando..." : "Marcar como Pagada (Efectivo)"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteExpiredBooking(booking.id)}
                    disabled={processing === booking.id}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}