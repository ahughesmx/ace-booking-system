
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { fromZonedTime } from "date-fns-tz";
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
import { Plus } from "lucide-react";

type Court = {
  id: string;
  name: string;
  court_type: string;
};

interface AddMaintenanceDialogProps {
  onMaintenanceAdded: () => void;
}

export function AddMaintenanceDialog({ onMaintenanceAdded }: AddMaintenanceDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    courtId: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    reason: "",
  });

  const { data: courts } = useQuery({
    queryKey: ["courts-for-maintenance"],
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
    
    if (!formData.courtId || !formData.startDate || !formData.startTime || 
        !formData.endDate || !formData.endTime || !formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos.",
        variant: "destructive",
      });
      return;
    }

    // Crear fechas locales interpretando como hora de México
    const mexicoTz = "America/Mexico_City";
    const startLocalStr = `${formData.startDate}T${formData.startTime}:00`;
    const endLocalStr = `${formData.endDate}T${formData.endTime}:00`;
    
    // Crear objetos Date interpretando como hora local de México
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

    // Convertir de hora de México a UTC usando fromZonedTime
    const startUTC = fromZonedTime(startLocal, mexicoTz);
    const endUTC = fromZonedTime(endLocal, mexicoTz);

    console.log('DEBUG Maintenance:', {
      startLocal: startLocalStr,
      endLocal: endLocalStr,
      startUTC: startUTC.toISOString(),
      endUTC: endUTC.toISOString()
    });

    try {
      setLoading(true);
      const { error } = await supabase
        .from("court_maintenance")
        .insert([{
          court_id: formData.courtId,
          start_time: startUTC.toISOString(),
          end_time: endUTC.toISOString(),
          reason: formData.reason.trim(),
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }]);

      if (error) throw error;

      toast({
        title: "Mantenimiento programado",
        description: "El período de mantenimiento ha sido programado exitosamente.",
      });

      setFormData({
        courtId: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        reason: "",
      });
      setOpen(false);
      onMaintenanceAdded();
    } catch (error) {
      console.error("Error adding maintenance:", error);
      toast({
        title: "Error",
        description: "No se pudo programar el mantenimiento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Programar Mantenimiento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Programar Mantenimiento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Programando..." : "Programar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
