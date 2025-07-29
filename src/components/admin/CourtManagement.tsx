
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AddCourtForm } from "./courts/AddCourtForm";
import { CourtsList } from "./courts/CourtsList";
import { MaintenanceList } from "./courts/MaintenanceList";
import { AvailableCourtTypes } from "./courts/AvailableCourtTypes";
import { Building, Calendar, Settings2 } from "lucide-react";

type Court = {
  id: string;
  name: string;
  court_type: string;
  created_at: string;
};

export default function CourtManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { data: courts, refetch } = useQuery({
    queryKey: ["courts-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("id, name, court_type, created_at")
        .order("name");

      if (error) throw error;
      return data as Court[];
    },
  });

  const handleAddCourt = async (newCourtName: string, courtType: 'tennis' | 'padel') => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("courts")
        .insert([{ 
          name: newCourtName.trim(),
          court_type: courtType
        }]);

      if (error) throw error;

      await refetch();
      toast({
        title: "Cancha agregada",
        description: `La cancha de ${courtType === 'tennis' ? 'tenis' : 'pádel'} ha sido agregada exitosamente.`,
      });
    } catch (error) {
      console.error("Error adding court:", error);
      toast({
        title: "Error",
        description: "No se pudo agregar la cancha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourt = async (courtId: string, newName: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("courts")
        .update({ name: newName.trim() })
        .eq("id", courtId);

      if (error) throw error;

      await refetch();
      toast({
        title: "Cancha actualizada",
        description: "El nombre de la cancha ha sido actualizado exitosamente.",
      });
    } catch (error) {
      console.error("Error updating court:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el nombre de la cancha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("courts")
        .delete()
        .eq("id", courtId);

      if (error) throw error;

      await refetch();
      toast({
        title: "Cancha eliminada",
        description: "La cancha ha sido eliminada exitosamente.",
      });
    } catch (error) {
      console.error("Error deleting court:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la cancha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-800">
          Gestión de Canchas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="types" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="types" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Tipos disponibles
            </TabsTrigger>
            <TabsTrigger value="courts" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Canchas
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Mantenimiento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="types" className="space-y-6">
            <AvailableCourtTypes />
          </TabsContent>

          <TabsContent value="courts" className="space-y-6">
            <AddCourtForm onAddCourt={handleAddCourt} loading={loading} />
            <CourtsList
              courts={courts || []}
              onEditCourt={handleEditCourt}
              onDeleteCourt={handleDeleteCourt}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceList />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
