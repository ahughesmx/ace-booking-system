
import { useState } from "react";
import { useBookingRules } from "@/hooks/use-booking-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase-client";

interface BookingRulesFormProps {
  courtType: 'tennis' | 'padel';
  courtTypeLabel: string;
}

function BookingRulesForm({ courtType, courtTypeLabel }: BookingRulesFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: rules, isLoading, refetch } = useBookingRules(courtType);

  console.log(`BookingRulesForm for ${courtType}:`, { rules, isLoading });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const maxBookings = parseInt(formData.get("maxBookings") as string);
    const minCancellationHours = parseInt(formData.get("minCancellationHours") as string);
    const allowConsecutive = formData.get("allowConsecutive") === "true";
    const allowCancellation = formData.get("allowCancellation") === "true";
    const timeBetweenHours = parseInt(formData.get("timeBetweenHours") as string);
    const maxDaysAhead = parseInt(formData.get("maxDaysAhead") as string);

    try {
      const { error } = await supabase
        .from("booking_rules")
        .update({
          max_active_bookings: maxBookings,
          min_cancellation_time: `${minCancellationHours}:00:00`,
          allow_consecutive_bookings: allowConsecutive,
          allow_cancellation: allowCancellation,
          time_between_bookings: `${timeBetweenHours}:00:00`,
          max_days_ahead: maxDaysAhead,
        })
        .eq("court_type", courtType);

      if (error) throw error;

      toast({
        title: "Reglas actualizadas",
        description: `Las reglas de reserva para ${courtTypeLabel} se han actualizado correctamente.`,
      });
      refetch();
    } catch (error) {
      console.error("Error updating booking rules:", error);
      toast({
        title: "Error",
        description: `No se pudieron actualizar las reglas de reserva para ${courtTypeLabel}.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!rules) {
    return <div>No se encontraron reglas de reserva para {courtTypeLabel}.</div>;
  }

  const minCancellationHours = parseInt(rules.min_cancellation_time.split(":")[0]);
  const timeBetweenHours = parseInt(rules.time_between_bookings.split(":")[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas de Reserva - {courtTypeLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor={`maxBookings-${courtType}`}>Máximo de reservas activas por usuario</Label>
            <Input
              id={`maxBookings-${courtType}`}
              name="maxBookings"
              type="number"
              min="1"
              max="10"
              defaultValue={rules.max_active_bookings}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`maxDaysAhead-${courtType}`}>
              Días permitidos para reservar hacia adelante
            </Label>
            <Input
              id={`maxDaysAhead-${courtType}`}
              name="maxDaysAhead"
              type="number"
              min="1"
              max="30"
              defaultValue={rules.max_days_ahead}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`minCancellationHours-${courtType}`}>
              Tiempo mínimo para cancelar (horas)
            </Label>
            <Input
              id={`minCancellationHours-${courtType}`}
              name="minCancellationHours"
              type="number"
              min="1"
              max="72"
              defaultValue={minCancellationHours}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id={`allowConsecutive-${courtType}`}
              name="allowConsecutive"
              defaultChecked={rules.allow_consecutive_bookings}
            />
            <Label htmlFor={`allowConsecutive-${courtType}`}>Permitir reservas consecutivas</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id={`allowCancellation-${courtType}`}
              name="allowCancellation"
              defaultChecked={rules.allow_cancellation}
            />
            <Label htmlFor={`allowCancellation-${courtType}`}>Permitir cancelación de reservas</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`timeBetweenHours-${courtType}`}>
              Tiempo mínimo entre reservas (horas)
            </Label>
            <Input
              id={`timeBetweenHours-${courtType}`}
              name="timeBetweenHours"
              type="number"
              min="1"
              max="24"
              defaultValue={timeBetweenHours}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              `Guardar cambios para ${courtTypeLabel}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function BookingRulesManagement() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BookingRulesForm courtType="tennis" courtTypeLabel="Tenis" />
        <BookingRulesForm courtType="padel" courtTypeLabel="Pádel" />
      </div>
    </div>
  );
}
