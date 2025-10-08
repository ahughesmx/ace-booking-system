import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";

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
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    courtId: "all",
    expectedReopeningDate: "",
    expectedReopeningTime: "",
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
    enabled: open,
  });

  const emergencyClosureMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      const expectedReopening = formData.expectedReopeningDate && formData.expectedReopeningTime
        ? new Date(`${formData.expectedReopeningDate}T${formData.expectedReopeningTime}:00`)
        : null;

      const { data: { user } } = await supabase.auth.getUser();

      // Si es "todas las canchas", crear un cierre para cada cancha
      if (formData.courtId === "all") {
        if (!courts) throw new Error("No se pudieron cargar las canchas");
        
        const closures = courts.map(court => ({
          court_id: court.id,
          start_time: now.toISOString(),
          end_time: endOfDay.toISOString(),
          reason: formData.reason.trim(),
          is_active: true,
          is_emergency: true,
          all_courts: true,
          expected_reopening: expectedReopening?.toISOString() || null,
          created_by: user?.id,
        }));

        const { error } = await supabase
          .from("court_maintenance")
          .insert(closures);

        if (error) throw error;
      } else {
        // Crear cierre para una cancha específica
        const { error } = await supabase
          .from("court_maintenance")
          .insert([{
            court_id: formData.courtId,
            start_time: now.toISOString(),
            end_time: endOfDay.toISOString(),
            reason: formData.reason.trim(),
            is_active: true,
            is_emergency: true,
            all_courts: false,
            expected_reopening: expectedReopening?.toISOString() || null,
            created_by: user?.id,
          }]);

        if (error) throw error;
      }

      // Buscar reservas afectadas y crear registros en affected_bookings
      const { data: affectedBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id")
        .eq("status", "paid")
        .gte("start_time", now.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .in("court_id", formData.courtId === "all" 
          ? courts?.map(c => c.id) || [] 
          : [formData.courtId]
        );

      if (bookingsError) throw bookingsError;

      // TODO: Aquí se llamará al webhook de notificación
      console.log("Reservas afectadas:", affectedBookings?.length || 0);
    },
    onSuccess: () => {
      toast({
        title: "Cierre imprevisto activado",
        description: `Se ha cerrado ${formData.courtId === "all" ? "todas las canchas" : "la cancha seleccionada"}. Se notificará a los usuarios con reservas afectadas.`,
      });
      queryClient.invalidateQueries({ queryKey: ["court-maintenance-all"] });
      queryClient.invalidateQueries({ queryKey: ["court-maintenance"] });
      onOpenChange(false);
      setFormData({
        courtId: "all",
        expectedReopeningDate: "",
        expectedReopeningTime: "",
        reason: "",
      });
    },
    onError: (error) => {
      console.error("Error creating emergency closure:", error);
      toast({
        title: "Error",
        description: "No se pudo activar el cierre imprevisto.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Por favor indica el motivo del cierre.",
        variant: "destructive",
      });
      return;
    }

    emergencyClosureMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Cierre Imprevisto de Canchas
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Esta acción bloqueará inmediatamente las nuevas reservas y notificará a los usuarios con reservas existentes.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="court">Cancha(s) afectada(s)</Label>
            <Select 
              value={formData.courtId} 
              onValueChange={(value) => 
                setFormData({ ...formData, courtId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cancha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  🚨 Todas las canchas (Cierre general)
                </SelectItem>
                {courts?.map((court) => (
                  <SelectItem key={court.id} value={court.id}>
                    {court.name} ({court.court_type === 'tennis' ? 'Tenis' : 'Pádel'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reopeningDate">Fecha probable apertura</Label>
              <Input
                id="reopeningDate"
                type="date"
                value={formData.expectedReopeningDate}
                onChange={(e) => setFormData({ ...formData, expectedReopeningDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reopeningTime">Hora probable</Label>
              <Input
                id="reopeningTime"
                type="time"
                value={formData.expectedReopeningTime}
                onChange={(e) => setFormData({ ...formData, expectedReopeningTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo del cierre *</Label>
            <Textarea
              id="reason"
              placeholder="Ejemplo: Lluvia intensa, problema eléctrico, mantenimiento urgente..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              Este mensaje se mostrará a los socios del club
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={emergencyClosureMutation.isPending}
            >
              {emergencyClosureMutation.isPending ? "Activando..." : "Activar Cierre"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}