import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Court = {
  id: string;
  name: string;
  court_type: string;
};

interface EmergencyClosureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmergencyClosureDialog({ open, onOpenChange }: EmergencyClosureDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [closureType, setClosureType] = useState<"single" | "all">("single");
  const [formData, setFormData] = useState({
    courtId: "",
    expectedDate: "",
    expectedTime: "",
    reason: "",
  });

  const { data: courts } = useQuery({
    queryKey: ["courts-for-emergency"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("id, name, court_type")
        .order("name");

      if (error) throw error;
      return data as Court[];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((closureType === "single" && !formData.courtId) || 
        !formData.expectedDate || !formData.expectedTime || 
        !formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const now = new Date();
      const expectedReopeningDateTime = `${formData.expectedDate}T${formData.expectedTime}:00`;
      
      // Crear el cierre imprevisto a partir de ahora
      const startDateTime = now.toISOString();
      
      // Si es cierre de todas las canchas, crear un registro para cada cancha
      if (closureType === "all" && courts) {
        const maintenanceRecords = courts.map(court => ({
          court_id: court.id,
          start_time: startDateTime,
          end_time: expectedReopeningDateTime,
          reason: formData.reason.trim(),
          is_emergency: true,
          expected_reopening: expectedReopeningDateTime,
          all_courts: true,
          created_by: null, // Se llenará con el usuario actual
        }));

        // Obtener el usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        
        // Asignar el usuario a cada registro
        const recordsWithUser = maintenanceRecords.map(record => ({
          ...record,
          created_by: user?.id,
        }));

        const { error } = await supabase
          .from("court_maintenance")
          .insert(recordsWithUser);

        if (error) throw error;

        // Obtener los IDs de los mantenimientos creados para notificar usuarios afectados
        const { data: createdMaintenances, error: fetchError } = await supabase
          .from("court_maintenance")
          .select("id, court_id")
          .eq("created_by", user?.id)
          .eq("is_emergency", true)
          .gte("created_at", new Date(Date.now() - 5000).toISOString());

        if (!fetchError && createdMaintenances) {
          // Buscar reservas afectadas para cada cancha
          await processAffectedBookings(createdMaintenances);
        }
      } else {
        // Cierre de una sola cancha
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: createdMaintenance, error } = await supabase
          .from("court_maintenance")
          .insert([{
            court_id: formData.courtId,
            start_time: startDateTime,
            end_time: expectedReopeningDateTime,
            reason: formData.reason.trim(),
            is_emergency: true,
            expected_reopening: expectedReopeningDateTime,
            all_courts: false,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (error) throw error;

        // Procesar reservas afectadas
        if (createdMaintenance) {
          await processAffectedBookings([{
            id: createdMaintenance.id,
            court_id: createdMaintenance.court_id,
          }]);
        }
      }

      toast({
        title: "Cierre imprevisto activado",
        description: `El cierre imprevisto ha sido activado. Se notificará a los usuarios con reservas afectadas.`,
      });

      setFormData({
        courtId: "",
        expectedDate: "",
        expectedTime: "",
        reason: "",
      });
      setClosureType("single");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating emergency closure:", error);
      toast({
        title: "Error",
        description: "No se pudo activar el cierre imprevisto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAffectedBookings = async (maintenances: { id: string; court_id: string }[]) => {
    try {
      // Para cada mantenimiento, buscar reservas afectadas
      for (const maintenance of maintenances) {
        const { data: affectedBookings, error } = await supabase
          .from("bookings")
          .select("id, user_id, start_time, end_time")
          .eq("court_id", maintenance.court_id)
          .eq("status", "paid")
          .gte("end_time", new Date().toISOString());

        if (error) {
          console.error("Error fetching affected bookings:", error);
          continue;
        }

        if (affectedBookings && affectedBookings.length > 0) {
          // Insertar en affected_bookings
          const affectedRecords = affectedBookings.map(booking => ({
            booking_id: booking.id,
            maintenance_id: maintenance.id,
            can_reschedule: true,
            user_notified: false,
          }));

          const { error: insertError } = await supabase
            .from("affected_bookings")
            .insert(affectedRecords);

          if (insertError) {
            console.error("Error inserting affected bookings:", insertError);
          }

          // Llamar webhook de notificación
          await triggerEmergencyClosureWebhook(affectedBookings, maintenance.id);
        }
      }
    } catch (error) {
      console.error("Error processing affected bookings:", error);
    }
  };

  const triggerEmergencyClosureWebhook = async (
    bookings: any[],
    maintenanceId: string
  ) => {
    try {
      // Obtener webhooks activos para cierre imprevisto
      const { data: webhooks } = await supabase
        .from("webhooks")
        .select("*")
        .eq("event_type", "emergency_closure")
        .eq("is_active", true);

      if (!webhooks || webhooks.length === 0) return;

      // Obtener detalles del mantenimiento
      const { data: maintenance } = await supabase
        .from("court_maintenance")
        .select(`
          id,
          reason,
          expected_reopening,
          court:courts(id, name, court_type)
        `)
        .eq("id", maintenanceId)
        .single();

      // Para cada booking, enviar notificación
      for (const booking of bookings) {
        const webhookData = {
          event: "emergency_closure",
          timestamp: new Date().toISOString(),
          data: {
            booking_id: booking.id,
            user_id: booking.user_id,
            maintenance_id: maintenanceId,
            reason: maintenance?.reason,
            expected_reopening: maintenance?.expected_reopening,
            court_name: maintenance?.court?.name,
            court_type: maintenance?.court?.court_type,
            booking_start_time: booking.start_time,
            booking_end_time: booking.end_time,
          },
        };

        // Enviar a cada webhook
        for (const webhook of webhooks) {
          try {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
              ...(webhook.headers as Record<string, string> || {}),
            };
            
            await fetch(webhook.url, {
              method: "POST",
              headers,
              body: JSON.stringify(webhookData),
            });
          } catch (error) {
            console.error(`Error calling webhook ${webhook.name}:`, error);
          }
        }
      }

      // Marcar como notificados
      const bookingIds = bookings.map(b => b.id);
      await supabase
        .from("affected_bookings")
        .update({
          user_notified: true,
          notified_at: new Date().toISOString(),
        })
        .in("booking_id", bookingIds)
        .eq("maintenance_id", maintenanceId);
    } catch (error) {
      console.error("Error triggering webhook:", error);
    }
  };

  // Get today's date for min date
  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Activar Cierre Imprevisto
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de cierre</Label>
            <RadioGroup value={closureType} onValueChange={(value: "single" | "all") => setClosureType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="font-normal cursor-pointer">
                  Cancha específica
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  Todas las canchas (cierre general)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {closureType === "single" && (
            <div className="space-y-2">
              <Label htmlFor="court">Cancha</Label>
              <Select value={formData.courtId} onValueChange={(value) => 
                setFormData({ ...formData, courtId: value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cancha" />
                </SelectTrigger>
                <SelectContent>
                  {courts?.map((court) => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.name} ({court.court_type === 'tennis' ? 'Tenis' : 'Pádel'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedDate">Fecha probable de apertura</Label>
              <Input
                id="expectedDate"
                type="date"
                min={today}
                value={formData.expectedDate}
                onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedTime">Hora probable</Label>
              <Input
                id="expectedTime"
                type="time"
                value={formData.expectedTime}
                onChange={(e) => setFormData({ ...formData, expectedTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo del cierre</Label>
            <Textarea
              id="reason"
              placeholder="Ej: Condiciones climáticas adversas, problema técnico urgente..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={4}
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Importante:</strong> Se notificará automáticamente a todos los usuarios con reservas afectadas y se les dará la opción de reagendar sin costo.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Activando..." : "Activar Cierre"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
