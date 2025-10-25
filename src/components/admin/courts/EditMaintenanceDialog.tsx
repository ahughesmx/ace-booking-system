import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

interface EditMaintenanceDialogProps {
  maintenanceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMaintenanceUpdated: () => void;
}

type MaintenanceData = {
  court_id: string;
  start_time: string;
  end_time: string;
  reason: string;
};

export function EditMaintenanceDialog({ 
  maintenanceId, 
  open, 
  onOpenChange, 
  onMaintenanceUpdated 
}: EditMaintenanceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    reason: "",
  });

  useEffect(() => {
    if (open && maintenanceId) {
      loadMaintenanceData();
    }
  }, [open, maintenanceId]);

  const loadMaintenanceData = async () => {
    try {
      const { data, error } = await supabase
        .from("court_maintenance")
        .select("court_id, start_time, end_time, reason")
        .eq("id", maintenanceId)
        .single();

      if (error) throw error;
      if (!data) return;

      const mexicoTz = "America/Mexico_City";
      
      // Extraer fecha y hora local de México de los timestamps UTC
      const startDate = formatInTimeZone(new Date(data.start_time), mexicoTz, "yyyy-MM-dd");
      const startTime = formatInTimeZone(new Date(data.start_time), mexicoTz, "HH:mm");
      const endDate = formatInTimeZone(new Date(data.end_time), mexicoTz, "yyyy-MM-dd");
      const endTime = formatInTimeZone(new Date(data.end_time), mexicoTz, "HH:mm");

      setFormData({
        startDate,
        startTime,
        endDate,
        endTime,
        reason: data.reason,
      });
    } catch (error) {
      console.error("Error loading maintenance:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar los datos del mantenimiento.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.startDate || !formData.startTime || 
        !formData.endDate || !formData.endTime || !formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos.",
        variant: "destructive",
      });
      return;
    }

    const mexicoTz = "America/Mexico_City";
    const startLocalStr = `${formData.startDate}T${formData.startTime}:00`;
    const endLocalStr = `${formData.endDate}T${formData.endTime}:00`;
    
    const startLocal = new Date(startLocalStr);
    const endLocal = new Date(endLocalStr);

    if (startLocal >= endLocal) {
      toast({
        title: "Error",
        description: "La fecha y hora de fin debe ser posterior a la de inicio.",
        variant: "destructive",
      });
      return;
    }

    const startUTC = fromZonedTime(startLocal, mexicoTz);
    const endUTC = fromZonedTime(endLocal, mexicoTz);

    try {
      setLoading(true);
      const { error } = await supabase
        .from("court_maintenance")
        .update({
          start_time: startUTC.toISOString(),
          end_time: endUTC.toISOString(),
          reason: formData.reason.trim(),
        })
        .eq("id", maintenanceId);

      if (error) throw error;

      toast({
        title: "Mantenimiento actualizado",
        description: "El período de mantenimiento ha sido actualizado exitosamente.",
      });

      onOpenChange(false);
      onMaintenanceUpdated();
      
      // Invalidar TODOS los caches de mantenimiento con comodines
      await queryClient.invalidateQueries({ 
        queryKey: ["court-maintenance"],
        refetchType: 'all' // Forzar refetch de queries activas e inactivas
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["active-maintenance"],
        refetchType: 'all'
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["court-maintenance-all"],
        refetchType: 'all'
      });
    } catch (error) {
      console.error("Error updating maintenance:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el mantenimiento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Mantenimiento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora inicio</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha fin</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Hora fin</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea
              id="reason"
              placeholder="Describe el motivo del mantenimiento..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
