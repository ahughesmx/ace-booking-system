
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { AlertTriangle, Clock, Calendar } from "lucide-react";
import { addHours, addDays, format } from "date-fns";

type Court = {
  id: string;
  name: string;
  court_type: string;
};

type Booking = {
  id: string;
  start_time: string;
  end_time: string;
  user?: {
    full_name: string;
    member_id?: string;
  };
};

type DisableCourtDialogProps = {
  court: Court | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function DisableCourtDialog({ court, isOpen, onClose, onSuccess }: DisableCourtDialogProps) {
  const [timeUnit, setTimeUnit] = useState<'hours' | 'days'>('hours');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictingBookings, setConflictingBookings] = useState<Booking[]>([]);
  const [transferOptions, setTransferOptions] = useState<Court[]>([]);
  const { toast } = useToast();

  // Query para obtener reservas existentes
  const { data: existingBookings } = useQuery({
    queryKey: ["court-bookings", court?.id, duration, timeUnit],
    queryFn: async () => {
      if (!court || !duration) return [];
      
      const startTime = new Date();
      const endTime = timeUnit === 'hours' 
        ? addHours(startTime, parseInt(duration))
        : addDays(startTime, parseInt(duration));

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, start_time, end_time,
          user:profiles(full_name, member_id)
        `)
        .eq("court_id", court.id)
        .gte("start_time", startTime.toISOString())
        .lt("start_time", endTime.toISOString())
        .order("start_time");

      if (error) throw error;
      return data || [];
    },
    enabled: !!(court && duration && parseInt(duration) > 0),
  });

  // Query para obtener canchas alternativas (solo para tenis)
  const { data: alternativeCourts } = useQuery({
    queryKey: ["alternative-courts", court?.court_type],
    queryFn: async () => {
      if (!court || court.court_type !== 'tennis') return [];
      
      const { data, error } = await supabase
        .from("courts")
        .select("id, name, court_type")
        .eq("court_type", "tennis")
        .neq("id", court.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!(court && court.court_type === 'tennis'),
  });

  const handleSubmit = async () => {
    if (!court || !duration || !reason.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    const durationNum = parseInt(duration);
    if (durationNum <= 0) {
      toast({
        title: "Error", 
        description: "La duración debe ser mayor que 0",
        variant: "destructive",
      });
      return;
    }

    // Si hay reservas existentes, mostrar diálogo de conflicto
    if (existingBookings && existingBookings.length > 0) {
      setConflictingBookings(existingBookings);
      setTransferOptions(alternativeCourts || []);
      setShowConflictDialog(true);
      return;
    }

    // Si no hay conflictos, proceder directamente
    await processDisabling(false, null);
  };

  const processDisabling = async (cancelBookings: boolean, transferToCourtId: string | null) => {
    if (!court) return;
    
    try {
      setLoading(true);

      const startTime = new Date();
      const endTime = timeUnit === 'hours' 
        ? addHours(startTime, parseInt(duration))
        : addDays(startTime, parseInt(duration));

      // Crear registro de mantenimiento
      const { error: maintenanceError } = await supabase
        .from("court_maintenance")
        .insert({
          court_id: court.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          reason: reason.trim(),
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (maintenanceError) throw maintenanceError;

      // Manejar reservas existentes
      if (conflictingBookings.length > 0) {
        if (cancelBookings) {
          // Cancelar todas las reservas
          const bookingIds = conflictingBookings.map(b => b.id);
          const { error: deleteError } = await supabase
            .from("bookings")
            .delete()
            .in("id", bookingIds);

          if (deleteError) throw deleteError;

          toast({
            title: "Reservas canceladas",
            description: `Se cancelaron ${conflictingBookings.length} reservas`,
          });
        } else if (transferToCourtId && court.court_type === 'tennis') {
          // Transferir reservas a otra cancha de tenis
          const { error: transferError } = await supabase
            .from("bookings")
            .update({ court_id: transferToCourtId })
            .in("id", conflictingBookings.map(b => b.id));

          if (transferError) throw transferError;

          const targetCourt = alternativeCourts?.find(c => c.id === transferToCourtId);
          toast({
            title: "Reservas transferidas",
            description: `Se transfirieron ${conflictingBookings.length} reservas a ${targetCourt?.name}`,
          });
        }
      }

      toast({
        title: "Cancha inhabilitada",
        description: `La cancha ${court.name} ha sido inhabilitada por ${duration} ${timeUnit === 'hours' ? 'horas' : 'días'}`,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error disabling court:", error);
      toast({
        title: "Error",
        description: "No se pudo inhabilitar la cancha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDuration('');
    setReason('');
    setTimeUnit('hours');
    setShowConflictDialog(false);
    setConflictingBookings([]);
    setTransferOptions([]);
    onClose();
  };

  if (!court) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Inhabilitar Cancha
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                <strong>Cancha:</strong> {court.name} ({court.court_type === 'tennis' ? 'Tenis' : 'Pádel'})
              </p>
            </div>

            <div className="space-y-2">
              <Label>Período de inhabilitación</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  className="flex-1"
                />
                <RadioGroup
                  value={timeUnit}
                  onValueChange={(value: 'hours' | 'days') => setTimeUnit(value)}
                  className="flex flex-row gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hours" id="hours" />
                    <Label htmlFor="hours" className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Horas
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="days" id="days" />
                    <Label htmlFor="days" className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Días
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo de la inhabilitación</Label>
              <Textarea
                id="reason"
                placeholder="Describe el motivo para inhabilitar la cancha..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {duration && parseInt(duration) > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Período:</strong> Desde ahora hasta{' '}
                  {format(
                    timeUnit === 'hours' 
                      ? addHours(new Date(), parseInt(duration))
                      : addDays(new Date(), parseInt(duration)),
                    'dd/MM/yyyy HH:mm'
                  )}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !duration || !reason.trim()}
                className="flex-1"
              >
                {loading ? "Procesando..." : "Inhabilitar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de conflictos */}
      <Dialog open={showConflictDialog} onOpenChange={() => setShowConflictDialog(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Reservas Existentes Detectadas
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800 mb-3">
                La cancha <strong>{court.name}</strong> tiene {conflictingBookings.length} reserva(s) 
                programada(s) durante el período seleccionado:
              </p>
              
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {conflictingBookings.map((booking) => (
                  <div key={booking.id} className="bg-white rounded p-2 text-sm">
                    <div className="font-medium">{booking.user?.full_name || 'Usuario desconocido'}</div>
                    <div className="text-gray-600">
                      {format(new Date(booking.start_time), 'dd/MM/yyyy HH:mm')} - {' '}
                      {format(new Date(booking.end_time), 'HH:mm')}
                    </div>
                    {booking.user?.member_id && (
                      <div className="text-xs text-gray-500">ID: {booking.user.member_id}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-medium">¿Qué deseas hacer con estas reservas?</p>
              
              <div className="flex flex-col gap-2">
                <Button
                  variant="destructive"
                  onClick={() => processDisabling(true, null)}
                  disabled={loading}
                  className="justify-start"
                >
                  Cancelar todas las reservas
                </Button>

                {court.court_type === 'tennis' && transferOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      O transferir a otra cancha de tenis disponible:
                    </p>
                    {transferOptions.map((altCourt) => (
                      <Button
                        key={altCourt.id}
                        variant="outline"
                        onClick={() => processDisabling(false, altCourt.id)}
                        disabled={loading}
                        className="justify-start"
                      >
                        Transferir a {altCourt.name}
                      </Button>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => setShowConflictDialog(false)}
                  disabled={loading}
                >
                  Cancelar operación
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
