import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface InterfacePreference {
  id: string;
  feature_key: string;
  display_name: string;
  description?: string;
  category: string;
  is_enabled: boolean;
}

const InterfacePreferencesManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingPreferences, setUpdatingPreferences] = useState<Set<string>>(new Set());

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["interface-preferences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interface_preferences")
        .select("*")
        .order("category", { ascending: true })
        .order("display_name", { ascending: true });

      if (error) throw error;
      return data as InterfacePreference[];
    },
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from("interface_preferences")
        .update({ is_enabled })
        .eq("id", id);

      if (error) throw error;
    },
    onMutate: ({ id }) => {
      setUpdatingPreferences(prev => new Set([...prev, id]));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interface-preferences"] });
      toast({
        title: "Preferencia actualizada",
        description: "La configuración de interfaz se ha actualizado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Error al actualizar la preferencia: " + error.message,
        variant: "destructive",
      });
    },
    onSettled: (_, __, { id }) => {
      setUpdatingPreferences(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    },
  });

  const handleTogglePreference = (id: string, currentValue: boolean) => {
    updatePreferenceMutation.mutate({ id, is_enabled: !currentValue });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const menuPreferences = preferences?.filter(p => p.category === 'menu') || [];
  const homeCardPreferences = preferences?.filter(p => p.category === 'home_cards') || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preferencias de Interfaz
          </CardTitle>
          <CardDescription>
            Configura qué elementos de la interfaz son visibles para los usuarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Opciones del Menú */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Opciones del Menú Principal</h3>
              <p className="text-sm text-muted-foreground">
                Controla qué opciones aparecen en el menú de navegación
              </p>
            </div>
            <div className="grid gap-4">
              {menuPreferences.map((preference) => (
                <div
                  key={preference.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <Label htmlFor={preference.feature_key} className="text-base font-medium">
                      {preference.display_name}
                    </Label>
                    {preference.description && (
                      <p className="text-sm text-muted-foreground">
                        {preference.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {updatingPreferences.has(preference.id) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <Switch
                      id={preference.feature_key}
                      checked={preference.is_enabled}
                      onCheckedChange={() => handleTogglePreference(preference.id, preference.is_enabled)}
                      disabled={updatingPreferences.has(preference.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Cards del Home */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Cards de la Página Principal</h3>
              <p className="text-sm text-muted-foreground">
                Controla qué tarjetas de acceso rápido se muestran en la página principal
              </p>
            </div>
            <div className="grid gap-4">
              {homeCardPreferences.map((preference) => (
                <div
                  key={preference.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <Label htmlFor={preference.feature_key} className="text-base font-medium">
                      {preference.display_name}
                    </Label>
                    {preference.description && (
                      <p className="text-sm text-muted-foreground">
                        {preference.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {updatingPreferences.has(preference.id) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <Switch
                      id={preference.feature_key}
                      checked={preference.is_enabled}
                      onCheckedChange={() => handleTogglePreference(preference.id, preference.is_enabled)}
                      disabled={updatingPreferences.has(preference.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterfacePreferencesManagement;