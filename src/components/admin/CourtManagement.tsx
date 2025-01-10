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
import { Plus, Pencil, X, Check, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Court = {
  id: string;
  name: string;
  created_at: string;
};

export default function CourtManagement() {
  const { toast } = useToast();
  const [newCourtName, setNewCourtName] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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

  const startEditing = (court: Court) => {
    setEditingId(court.id);
    setEditName(court.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleEditCourt = async (courtId: string) => {
    if (!editName.trim()) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("courts")
        .update({ name: editName.trim() })
        .eq("id", courtId);

      if (error) throw error;

      await refetch();
      setEditingId(null);
      toast({
        title: "Cancha actualizada",
        description: "El nombre de la cancha ha sido actualizado exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el nombre de la cancha.",
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
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Nombre de la cancha"
              value={newCourtName}
              onChange={(e) => setNewCourtName(e.target.value)}
              className="pl-4 h-11 border-gray-200 focus:border-primary focus:ring-primary"
            />
          </div>
          <Button
            onClick={handleAddCourt}
            disabled={loading || !newCourtName.trim()}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar cancha
          </Button>
        </div>

        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-600">
                  Nombre
                </TableHead>
                <TableHead className="font-semibold text-gray-600">
                  Fecha de creación
                </TableHead>
                <TableHead className="font-semibold text-gray-600 text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courts?.map((court) => (
                <TableRow
                  key={court.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <TableCell className="font-medium">
                    {editingId === court.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="max-w-xs"
                      />
                    ) : (
                      <span className="text-gray-700">{court.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(court.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      {editingId === court.id ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCourt(court.id)}
                            disabled={loading || !editName.trim()}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEditing}
                            disabled={loading}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-200"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(court)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCourt(court.id)}
                        disabled={loading}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}