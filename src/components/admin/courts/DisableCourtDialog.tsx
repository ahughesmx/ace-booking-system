import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { AlertTriangle, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format, addHours, addDays, startOfDay, endOfDay, setHours, setMinutes } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictingBookings, setConflictingBookings] = useState<Booking[]>([]);
  const [transferOptions, setTransferOptions] = useState<Court[]>([]);
  
  // Estados para el modo "Horas"
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  
  // Estados para el modo "Días"
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  const { toast } = useToast();

  // Calcular las fechas de inicio y fin basadas en la configuración
  const getMaintenancePeriod = () => {
    if (timeUnit === 'hours') {
      if (!selectedDate || !startHour || !endHour) return null;
      
      const [startH, startM] = startHour.split(':').map(Number);
      const [endH, endM] = endHour.split(':').map(Number);
      
      const startTime = setMinutes(setHours(selectedDate, startH), startM || 0);
      const endTime = setMinutes(setHours(selectedDate, endH), endM || 0);
      
      return { startTime, endTime };
    } else {
      if (!startDate || !endDate) return null;
      
      const startTime = startOfDay(startDate);
      const endTime = endOfDay(endDate);
      
      return { startTime, endTime };
    }
  };

  const maintenancePeriod = getMaintenancePeriod();

  // Query para obtener reservas existentes
  const { data: existingBookings } = useQuery({
    queryKey: ["court-bookings", court?.id, maintenancePeriod?.startTime, maintenancePeriod?.endTime],
    queryFn: async () => {
      if (!court || !maintenancePeriod) return [];
      
      const { startTime, endTime } = maintenancePeriod;

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
    enabled: !!(court && maintenancePeriod),
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

  const isFormValid = () => {
    if (!reason.trim()) return false;
    
    if (timeUnit === 'hours') {
      return !!(selectedDate && startHour && endHour);
    } else {
      return !!(startDate && endDate);
    }
  };

  const handleSubmit = async () => {
    if (!court || !isFormValid()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
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
    if (!court || !maintenancePeriod) return;
    
    try {
      setLoading(true);

      const { startTime, endTime } = maintenancePeriod;

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

      const periodDescription = timeUnit === 'hours' 
        ? `desde ${format(startTime, 'dd/MM/yyyy HH:mm')} hasta ${format(endTime, 'dd/MM/yyyy HH:mm')}`
        : `desde ${format(startTime, 'dd/MM/yyyy')} hasta ${format(endTime, 'dd/MM/yyyy')}`;

      toast({
        title: "Cancha inhabilitada",
        description: `La cancha ${court.name} ha sido inhabilitada ${periodDescription}`,
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
    setReason('');
    setTimeUnit('hours');
    setSelectedDate(new Date());
    setStartHour('');
    setEndHour('');
    setStartDate(undefined);
    setEndDate(undefined);
    setShowConflictDialog(false);
    setConflictingBookings([]);
    setTransferOptions([]);
    onClose();
  };

  if (!court) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Inhabilitar Cancha
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                <strong>Cancha:</strong> {court.name} ({court.court_type === 'tennis' ? 'Tenis' : 'Pádel'})
              </p>
            </div>

            {/* Selector de tipo de período */}
            <div className="space-y-3">
              <Label>Tipo de período</Label>
              <RadioGroup
                value={timeUnit}
                onValueChange={(value: 'hours' | 'days') => setTimeUnit(value)}
                className="flex flex-row gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hours" id="hours" />
                  <Label htmlFor="hours" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Por Horas (mismo día)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="days" id="days" />
                  <Label htmlFor="days" className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Por Días (rango de fechas)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Configuración para modo "Horas" */}
            {timeUnit === 'hours' && (
              <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Configuración por horas</h4>
                
                <div className="space-y-2">
                  <Label>Seleccionar día</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 max-w-none" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="w-full"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-hour">Hora de inicio</Label>
                    <Input
                      id="start-hour"
                      type="time"
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-hour">Hora de fin</Label>
                    <Input
                      id="end-hour"
                      type="time"
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Configuración para modo "Días" */}
            {timeUnit === 'days' && (
              <div className="space-y-4 bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Configuración por días</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Día inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : "Fecha inicial"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 max-w-none" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="w-full"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Día final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "dd/MM/yyyy") : "Fecha final"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 max-w-none" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => date < (startDate || new Date())}
                          initialFocus
                          className="w-full"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}

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

            {/* Resumen del período */}
            {maintenancePeriod && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Período de inhabilitación:</strong><br />
                  Desde: {format(maintenancePeriod.startTime, 'dd/MM/yyyy HH:mm')}<br />
                  Hasta: {format(maintenancePeriod.endTime, 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !isFormValid()}
                className="flex-1"
              >
                {loading ? "Procesando..." : "Inhabilitar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de conflictos - mantener el mismo código existente */}
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
