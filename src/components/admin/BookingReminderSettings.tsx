import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Clock, Bell, Settings, Play, Power, PowerOff, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BookingReminderSettings {
  id: string;
  hours_before_booking: number;
  is_enabled: boolean;
}

interface CronjobStatus {
  exists: boolean;
  schedule?: string;
}

const FREQUENCY_OPTIONS = [
  { value: '*/15 * * * *', label: 'Cada 15 minutos' },
  { value: '*/30 * * * *', label: 'Cada 30 minutos' },
  { value: '0 * * * *', label: 'Cada hora' },
  { value: '0 */2 * * *', label: 'Cada 2 horas' },
  { value: '0 */6 * * *', label: 'Cada 6 horas' },
];

export function BookingReminderSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isLoading: authLoading } = useAdminAuth();
  
  const [hoursBeforeBooking, setHoursBeforeBooking] = useState(2);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isTestingReminders, setIsTestingReminders] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState('*/30 * * * *');

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['booking-reminder-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_reminder_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as BookingReminderSettings;
    },
    enabled: !authLoading,
  });

  // Fetch cronjob status
  const { data: cronjobStatus, isLoading: cronjobLoading } = useQuery({
    queryKey: ['cronjob-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-booking-cronjob', {
        body: { action: 'status' }
      });
      
      if (error) throw error;
      return data as CronjobStatus;
    },
    enabled: !authLoading,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      setHoursBeforeBooking(settings.hours_before_booking);
      setIsEnabled(settings.is_enabled);
    }
  }, [settings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: { hours_before_booking: number; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('booking_reminder_settings')
        .update({
          hours_before_booking: newSettings.hours_before_booking,
          is_enabled: newSettings.is_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Configuración guardada",
        description: "La configuración de recordatorios se guardó exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['booking-reminder-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Error al guardar la configuración: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Test reminders manually
  const testRemindersMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('booking-reminders');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Prueba completada",
        description: `Se procesaron ${data.processed || 0} recordatorios`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en prueba",
        description: `Error al ejecutar prueba: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Manage cronjob (create/delete)
  const manageCronjobMutation = useMutation({
    mutationFn: async ({ action, frequency }: { action: 'create' | 'delete'; frequency?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-booking-cronjob', {
        body: { action, frequency }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      const actionText = variables.action === 'create' ? 'activado' : 'desactivado';
      toast({
        title: `Cronjob ${actionText}`,
        description: data.message || `El cronjob se ha ${actionText} exitosamente`,
      });
      queryClient.invalidateQueries({ queryKey: ['cronjob-status'] });
    },
    onError: (error: any, variables) => {
      const actionText = variables.action === 'create' ? 'activar' : 'desactivar';
      toast({
        title: `Error al ${actionText} cronjob`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (hoursBeforeBooking < 1 || hoursBeforeBooking > 72) {
      toast({
        title: "Valor inválido",
        description: "Las horas deben estar entre 1 y 72",
        variant: "destructive",
      });
      return;
    }

    saveSettingsMutation.mutate({
      hours_before_booking: hoursBeforeBooking,
      is_enabled: isEnabled,
    });
  };

  const handleTestReminders = () => {
    setIsTestingReminders(true);
    testRemindersMutation.mutate();
    setTimeout(() => setIsTestingReminders(false), 5000);
  };

  const handleActivateCronjob = () => {
    manageCronjobMutation.mutate({ 
      action: 'create', 
      frequency: selectedFrequency 
    });
  };

  const handleDeactivateCronjob = () => {
    manageCronjobMutation.mutate({ action: 'delete' });
  };

  if (authLoading || isLoading || cronjobLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recordatorios de Reserva
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Recordatorios de Reserva
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cronjob Status Alert */}
        <Alert className={cronjobStatus?.exists ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Estado del Cronjob:</strong> {cronjobStatus?.exists ? 
              `✅ Activo (${cronjobStatus.schedule})` : 
              '❌ Inactivo - Los recordatorios no se enviarán automáticamente'
            }
          </AlertDescription>
        </Alert>

        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Los recordatorios se envían automáticamente a través de webhooks del tipo "booking_reminder". 
            Configura primero el webhook correspondiente en la sección de Webhooks.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6">
          {/* Settings Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de Recordatorios
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enabled-switch">Habilitar recordatorios</Label>
                <p className="text-sm text-muted-foreground">
                  Activar/desactivar el sistema de recordatorios automáticos
                </p>
              </div>
              <Switch
                id="enabled-switch"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hours-input">Horas antes de la reserva</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="hours-input"
                  type="number"
                  min="1"
                  max="72"
                  value={hoursBeforeBooking}
                  onChange={(e) => setHoursBeforeBooking(parseInt(e.target.value) || 1)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">horas</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Tiempo de anticipación para enviar el recordatorio (entre 1 y 72 horas)
              </p>
            </div>
          </div>

          {/* Cronjob Management Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Power className="h-5 w-5" />
              Automatización (Cronjob)
            </h3>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="frequency-select">Frecuencia de ejecución</Label>
                <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona la frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Define con qué frecuencia se ejecutará la verificación de recordatorios
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!cronjobStatus?.exists ? (
                  <Button 
                    onClick={handleActivateCronjob}
                    disabled={manageCronjobMutation.isPending}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Power className="h-4 w-4" />
                    {manageCronjobMutation.isPending ? 'Activando...' : 'Activar Cronjob'}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleDeactivateCronjob}
                    disabled={manageCronjobMutation.isPending}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <PowerOff className="h-4 w-4" />
                    {manageCronjobMutation.isPending ? 'Desactivando...' : 'Desactivar Cronjob'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saveSettingsMutation.isPending}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {saveSettingsMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
          </Button>

          <Button 
            variant="outline" 
            onClick={handleTestReminders}
            disabled={isTestingReminders || testRemindersMutation.isPending}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isTestingReminders || testRemindersMutation.isPending ? 'Ejecutando...' : 'Probar Ahora'}
          </Button>
        </div>

        {isEnabled && (
          <Alert>
            <AlertDescription>
              <strong>Estado:</strong> Los recordatorios están habilitados y se enviarán {hoursBeforeBooking} hora{hoursBeforeBooking !== 1 ? 's' : ''} antes de cada reserva.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}