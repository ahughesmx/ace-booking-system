import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { Loader2, Clock, Settings, Trash2 } from "lucide-react";

type MatchManagementSettings = {
  id: string;
  cleanup_hours_after_booking: number;
  cleanup_enabled: boolean;
  cleanup_frequency_minutes: number;
};

export default function MatchManagementSettings() {
  const [settings, setSettings] = useState<MatchManagementSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    cleanup_hours_after_booking: 5,
    cleanup_enabled: true,
    cleanup_frequency_minutes: 60,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("match_management_settings")
        .select("*")
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
        setFormData({
          cleanup_hours_after_booking: data.cleanup_hours_after_booking,
          cleanup_enabled: data.cleanup_enabled,
          cleanup_frequency_minutes: data.cleanup_frequency_minutes,
        });
      }
    } catch (error) {
      console.error("Error fetching match management settings:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("match_management_settings")
        .update({
          cleanup_hours_after_booking: formData.cleanup_hours_after_booking,
          cleanup_enabled: formData.cleanup_enabled,
          cleanup_frequency_minutes: formData.cleanup_frequency_minutes,
        })
        .eq("id", settings?.id);

      if (error) throw error;

      toast({
        title: "Configuración guardada",
        description: "Las configuraciones de gestión de partidos se han actualizado correctamente",
      });

      fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las configuraciones",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const runCleanupNow = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-incomplete-matches');
      
      if (error) throw error;

      toast({
        title: "Limpieza ejecutada",
        description: `Se han procesado los partidos incompletos. ${data?.deleted || 0} partidos eliminados.`,
      });
    } catch (error) {
      console.error("Error running cleanup:", error);
      toast({
        title: "Error",
        description: "No se pudo ejecutar la limpieza de partidos",
        variant: "destructive",
      });
    }
  };

  const runBookingCleanup = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-expired-bookings');
      
      if (error) throw error;

      toast({
        title: "Limpieza de reservas ejecutada",
        description: `${data?.totalDeleted || 0} reservas expiradas eliminadas.`,
      });
    } catch (error) {
      console.error("Error running booking cleanup:", error);
      toast({
        title: "Error",
        description: "No se pudo ejecutar la limpieza de reservas expiradas",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestión de Partidos</h2>
        <p className="text-muted-foreground">
          Configura las reglas para la limpieza automática de partidos incompletos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Limpieza Automática
          </CardTitle>
          <CardDescription>
            Configura cuándo y cómo se eliminan automáticamente los partidos incompletos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar limpieza automática</Label>
              <p className="text-sm text-muted-foreground">
                Activa o desactiva la limpieza automática de partidos incompletos
              </p>
            </div>
            <Switch
              checked={formData.cleanup_enabled}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, cleanup_enabled: checked }))
              }
            />
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cleanup-hours">
                Horas después de la reservación
              </Label>
              <Input
                id="cleanup-hours"
                type="number"
                min="1"
                max="168"
                value={formData.cleanup_hours_after_booking}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    cleanup_hours_after_booking: parseInt(e.target.value) || 5
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Tiempo después del final de la reservación para eliminar partidos incompletos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cleanup-frequency">
                Frecuencia de limpieza (minutos)
              </Label>
              <Input
                id="cleanup-frequency"
                type="number"
                min="15"
                max="1440"
                value={formData.cleanup_frequency_minutes}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    cleanup_frequency_minutes: parseInt(e.target.value) || 60
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Con qué frecuencia se ejecuta la limpieza automática
              </p>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="font-medium mb-2">Reglas de eliminación</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Singles:</strong> Se eliminan partidos donde player2_id es null</p>
              <p><strong>Dobles:</strong> Se eliminan partidos donde faltan player1_partner_id o player2_partner_id</p>
              <p>Solo se eliminan partidos que hayan pasado el tiempo configurado después del final de la reservación</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar Configuración
            </Button>

            <Button
              variant="outline"
              onClick={runCleanupNow}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Limpiar Partidos
            </Button>

            <Button
              variant="outline"
              onClick={runBookingCleanup}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar Reservas Expiradas
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-orange-600" />
            Limpieza Automática de Reservas
          </CardTitle>
          <CardDescription>
            Las reservas con estado "pending_payment" que exceden el tiempo permitido se eliminan automáticamente cada 15 minutos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800 dark:text-orange-200">
                  Sistema de Limpieza Automática Activo
                </h4>
                <div className="text-sm text-orange-700 dark:text-orange-300 mt-1 space-y-1">
                  <p>• <strong>Frecuencia:</strong> Cada 15 minutos</p>
                  <p>• <strong>Objetivo:</strong> Eliminar reservas "pending_payment" expiradas</p>
                  <p>• <strong>Beneficio:</strong> Libera slots automáticamente para nuevas reservas</p>
                  <p>• <strong>Configuración:</strong> Basado en el campo "expires_at" de cada reserva</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}