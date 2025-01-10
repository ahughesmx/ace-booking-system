import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link, Copy, CheckSquare, Square } from "lucide-react";

export default function DisplayManagement() {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);

  const { data: displaySettings, refetch } = useQuery({
    queryKey: ["display-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("display_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleToggleDisplay = async () => {
    try {
      const { error } = await supabase
        .from("display_settings")
        .update({ is_enabled: !displaySettings?.is_enabled })
        .eq("id", displaySettings?.id);

      if (error) throw error;

      await refetch();
      toast({
        title: "Display actualizado",
        description: `El display ha sido ${
          !displaySettings?.is_enabled ? "habilitado" : "deshabilitado"
        }`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del display",
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-base font-medium">URL del Display</h3>
              <p className="text-sm text-muted-foreground">
                Copiar la URL para mostrar en una pantalla
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCopyUrl}
            >
              {copying ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar URL
                </>
              )}
            </Button>
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