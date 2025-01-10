import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface BookingRules {
  id: string;
  max_active_bookings: number;
  min_cancellation_time: string;
  allow_consecutive_bookings: boolean;
  time_between_bookings: string;
  max_days_ahead: number;
}

export default function BookingRulesManagement() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rules, isLoading, refetch } = useQuery({
    queryKey: ["bookingRules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_rules")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      return data as BookingRules;
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const maxBookings = parseInt(formData.get("maxBookings") as string);
    const minCancellationHours = parseInt(formData.get("minCancellationHours") as string);
    const allowConsecutive = formData.get("allowConsecutive") === "true";
    const timeBetweenHours = parseInt(formData.get("timeBetweenHours") as string);
    const maxDaysAhead = parseInt(formData.get("maxDaysAhead") as string);

    try {
      const { error } = await supabase
        .from("booking_rules")
        .update({
          max_active_bookings: maxBookings,
          min_cancellation_time: `${minCancellationHours}:00:00`,
          allow_consecutive_bookings: allowConsecutive,
          time_between_bookings: `${timeBetweenHours}:00:00`,
          max_days_ahead: maxDaysAhead,
        })
        .eq("id", rules?.id);

      if (error) throw error;

      toast({
        title: "Reglas actualizadas",
        description: "Las reglas de reserva se han actualizado correctamente.",
      });
      refetch();
    } catch (error) {
      console.error("Error updating booking rules:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las reglas de reserva.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!rules) {
    return <div>No se encontraron reglas de reserva.</div>;
  }

  const minCancellationHours = parseInt(rules.min_cancellation_time.split(":")[0]);
  const timeBetweenHours = parseInt(rules.time_between_bookings.split(":")[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas de Reserva</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="maxBookings">Máximo de reservas activas por usuario</Label>
            <Input
              id="maxBookings"
              name="maxBookings"
              type="number"
              min="1"
              max="10"
              defaultValue={rules.max_active_bookings}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxDaysAhead">
              Días permitidos para reservar hacia adelante
            </Label>
            <Input
              id="maxDaysAhead"
              name="maxDaysAhead"
              type="number"
              min="1"
              max="30"
              defaultValue={rules.max_days_ahead}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minCancellationHours">
              Tiempo mínimo para cancelar (horas)
            </Label>
            <Input
              id="minCancellationHours"
              name="minCancellationHours"
              type="number"
              min="1"
              max="72"
              defaultValue={minCancellationHours}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="allowConsecutive"
              name="allowConsecutive"
              defaultChecked={rules.allow_consecutive_bookings}
            />
            <Label htmlFor="allowConsecutive">Permitir reservas consecutivas</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeBetweenHours">
              Tiempo mínimo entre reservas (horas)
            </Label>
            <Input
              id="timeBetweenHours"
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
              "Guardar cambios"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}