import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

type Court = {
  id: string;
  name: string;
  created_at: string;
};

export default function CourtManagement() {
  const { toast } = useToast();
  const [newCourtName, setNewCourtName] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: courts, refetch } = useQuery({
    queryKey: ["courts-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Court[];
    },
  });

  const handleAddCourt = async () => {
    if (!newCourtName.trim()) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("courts")
        .insert([{ name: newCourtName.trim() }]);

      if (error) throw error;

      setNewCourtName("");
      await refetch();
      toast({
        title: "Cancha agregada",
        description: "La cancha ha sido agregada exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar la cancha.",
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
    <div className="space-y-6">
      <div className="flex gap-4">
        <Input
          placeholder="Nombre de la cancha"
          value={newCourtName}
          onChange={(e) => setNewCourtName(e.target.value)}
          className="max-w-xs"
        />
        <Button
          onClick={handleAddCourt}
          disabled={loading || !newCourtName.trim()}
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar cancha
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Fecha de creación</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courts?.map((court) => (
            <TableRow key={court.id}>
              <TableCell>{court.name}</TableCell>
              <TableCell>
                {new Date(court.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteCourt(court.id)}
                  disabled={loading}
                >
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}