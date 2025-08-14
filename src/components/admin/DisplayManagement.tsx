import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminButton } from "@/components/admin/AdminButton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckSquare } from "lucide-react";

export default function DisplayManagement() {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);

  const { data: displaySettings, refetch } = useQuery({
    queryKey: ["display-settings"],
    queryFn: async () => {
      // First try to get existing settings
      const { data: existingSettings, error: fetchError } = await supabase
        .from("display_settings")
        .select("*")
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching display settings:", fetchError);
        throw fetchError;
      }

      // If no settings exist, create default settings
      if (!existingSettings) {
        const { data: newSettings, error: insertError } = await supabase
          .from("display_settings")
          .insert([
            {
              is_enabled: true,
              rotation_interval: 10000,
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error("Error creating default display settings:", insertError);
          throw insertError;
        }

        return newSettings;
      }

      return existingSettings;
    },
  });

  const handleToggleDisplay = async () => {
    try {
      if (!displaySettings?.id) {
        // Create new settings if they don't exist
        const { error: insertError } = await supabase
          .from("display_settings")
          .insert([
            {
              is_enabled: true,
              rotation_interval: 10000,
            },
          ]);

        if (insertError) throw insertError;
      } else {
        // Update existing settings
        const { error } = await supabase
          .from("display_settings")
          .update({ is_enabled: !displaySettings.is_enabled })
          .eq("id", displaySettings.id);

        if (error) throw error;
      }

      await refetch();
      toast({
        title: "Display actualizado",
        description: `El display ha sido ${
          !displaySettings?.is_enabled ? "habilitado" : "deshabilitado"
        }`,
      });
    } catch (error) {
      console.error("Error toggling display:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del display",
        variant: "destructive",
      });
    }
  };

  const handleUpdateInterval = async (newInterval: number) => {
    try {
      if (!displaySettings?.id) {
        const { error: insertError } = await supabase
          .from("display_settings")
          .insert([
            {
              is_enabled: true,
              rotation_interval: newInterval,
            },
          ]);

        if (insertError) throw insertError;
      } else {
        const { error } = await supabase
          .from("display_settings")
          .update({ rotation_interval: newInterval })
          .eq("id", displaySettings.id);

        if (error) throw error;
      }

      await refetch();
      toast({
        title: "Intervalo actualizado",
        description: "El intervalo de rotación ha sido actualizado",
      });
    } catch (error) {
      console.error("Error updating interval:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el intervalo de rotación",
        variant: "destructive",
      });
    }
  };

  const handleToggleAllView = async () => {
    try {
      if (!displaySettings?.id) return;
      
      const { error } = await supabase
        .from("display_settings")
        .update({ enable_all_view: !displaySettings.enable_all_view })
        .eq("id", displaySettings.id);

      if (error) throw error;

      await refetch();
      toast({
        title: "Vista actualizada",
        description: `Vista "Todas las canchas" ${!displaySettings.enable_all_view ? 'habilitada' : 'deshabilitada'}`,
      });
    } catch (error) {
      console.error("Error updating all view setting:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración de vista",
        variant: "destructive",
      });
    }
  };

  const handleToggleSingleView = async () => {
    try {
      if (!displaySettings?.id) return;
      
      const { error } = await supabase
        .from("display_settings")
        .update({ enable_single_view: !displaySettings.enable_single_view })
        .eq("id", displaySettings.id);

      if (error) throw error;

      await refetch();
      toast({
        title: "Vista actualizada",
        description: `Vista "Individual" ${!displaySettings.enable_single_view ? 'habilitada' : 'deshabilitada'}`,
      });
    } catch (error) {
      console.error("Error updating single view setting:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración de vista",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDefaultView = async (view: 'all' | 'single') => {
    try {
      if (!displaySettings?.id) return;
      
      const { error } = await supabase
        .from("display_settings")
        .update({ default_view: view })
        .eq("id", displaySettings.id);

      if (error) throw error;

      await refetch();
      toast({
        title: "Vista predeterminada actualizada",
        description: `Ahora se mostrará "${view === 'all' ? 'Todas las canchas' : 'Individual'}" por defecto`,
      });
    } catch (error) {
      console.error("Error updating default view:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la vista predeterminada",
        variant: "destructive",
      });
    }
  };

  const handleCopyUrl = async () => {
    const displayUrl = `${window.location.origin}/display`;
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopying(true);
      toast({
        title: "URL copiada",
        description: "La URL del display ha sido copiada al portapapeles",
      });
      setTimeout(() => setCopying(false), 2000);
    } catch (error) {
      console.error("Error copying URL:", error);
      toast({
        title: "Error",
        description: "No se pudo copiar la URL",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión del Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estado Principal del Display */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-base font-medium">Estado del Display</h3>
              <p className="text-sm text-muted-foreground">
                Habilitar o deshabilitar la visualización del display
              </p>
            </div>
            <Switch
              checked={displaySettings?.is_enabled}
              onCheckedChange={handleToggleDisplay}
            />
          </div>

          <Separator />

          {/* Controles de Vistas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configuración de Vistas</h3>
            
            {/* Vista Todas las Canchas */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-sm font-medium">Vista "Todas las Canchas"</h4>
                <p className="text-xs text-muted-foreground">
                  Mostrar todas las canchas en una sola vista de cuadrícula
                </p>
              </div>
              <Switch
                checked={displaySettings?.enable_all_view ?? true}
                onCheckedChange={handleToggleAllView}
              />
            </div>

            {/* Vista Individual */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-sm font-medium">Vista "Individual"</h4>
                <p className="text-xs text-muted-foreground">
                  Mostrar una cancha a la vez con rotación automática
                </p>
              </div>
              <Switch
                checked={displaySettings?.enable_single_view ?? true}
                onCheckedChange={handleToggleSingleView}
              />
            </div>

            {/* Vista Predeterminada */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Vista Predeterminada</h4>
              <p className="text-xs text-muted-foreground">
                Selecciona qué vista se mostrará por defecto al cargar el display
              </p>
              <div className="flex gap-2">
                <Button
                  variant={displaySettings?.default_view === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleUpdateDefaultView('all')}
                  disabled={!displaySettings?.enable_all_view}
                >
                  Todas las Canchas
                </Button>
                <Button
                  variant={displaySettings?.default_view === 'single' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleUpdateDefaultView('single')}
                  disabled={!displaySettings?.enable_single_view}
                >
                  Individual
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Intervalo de Rotación */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interval">Intervalo de Rotación (ms)</Label>
              <p className="text-xs text-muted-foreground">
                Tiempo en milisegundos para cambiar automáticamente en la vista individual
              </p>
              <div className="flex gap-2">
                <Input
                  id="interval"
                  type="number"
                  min="1000"
                  step="1000"
                  value={displaySettings?.rotation_interval}
                  onChange={(e) => handleUpdateInterval(Number(e.target.value))}
                  className="max-w-[200px]"
                />
                <span className="text-sm text-muted-foreground self-center">
                  ms (1000ms = 1 segundo)
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* URL del Display */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-base font-medium">URL del Display</h3>
              <p className="text-sm text-muted-foreground">
                Copiar la URL para mostrar en una pantalla
              </p>
            </div>
            <AdminButton
              variant="outline"
              size="sm"
              icon={copying ? <CheckSquare className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              onClick={handleCopyUrl}
            >
              {copying ? "Copiado" : "Copiar URL"}
            </AdminButton>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vista Previa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video w-full border rounded-lg overflow-hidden">
            <iframe
              src="/display"
              className="w-full h-full"
              title="Display Preview"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
