import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings2 } from "lucide-react";

type AvailableCourtType = {
  id: string;
  type_name: string;
  display_name: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export function AvailableCourtTypes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");

  const { data: courtTypes, refetch } = useQuery({
    queryKey: ["available-court-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("available_court_types")
        .select("*")
        .order("display_name");

      if (error) throw error;
      return data as AvailableCourtType[];
    },
  });

  const handleToggleType = async (id: string, isEnabled: boolean) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("available_court_types")
        .update({ is_enabled: isEnabled })
        .eq("id", id);

      if (error) throw error;

      await refetch();
      toast({
        title: isEnabled ? "Tipo habilitado" : "Tipo deshabilitado",
        description: `El tipo de cancha ha sido ${isEnabled ? "habilitado" : "deshabilitado"} exitosamente.`,
      });
    } catch (error) {
      console.error("Error updating court type:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el tipo de cancha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || !newDisplayName.trim()) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("available_court_types")
        .insert([{
          type_name: newTypeName.toLowerCase().trim(),
          display_name: newDisplayName.trim(),
          is_enabled: true,
        }]);

      if (error) throw error;

      await refetch();
      setNewTypeName("");
      setNewDisplayName("");
      toast({
        title: "Tipo añadido",
        description: "El nuevo tipo de cancha ha sido añadido exitosamente.",
      });
    } catch (error) {
      console.error("Error adding court type:", error);
      toast({
        title: "Error",
        description: "No se pudo añadir el tipo de cancha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add new court type form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Añadir Nuevo Tipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddType} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type_name">Nombre Técnico</Label>
                <Input
                  id="type_name"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="ej: football"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Nombre a Mostrar</Label>
                <Input
                  id="display_name"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="ej: Fútbol"
                  disabled={loading}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Añadiendo..." : "Añadir Tipo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing court types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Tipos Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courtTypes?.map((type) => (
              <div key={type.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h3 className="font-medium">{type.display_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Nombre técnico: {type.type_name}
                  </p>
                </div>
                <Switch
                  checked={type.is_enabled}
                  onCheckedChange={(checked) => handleToggleType(type.id, checked)}
                  disabled={loading}
                />
              </div>
            ))}
            {(!courtTypes || courtTypes.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No hay tipos de cancha configurados.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
