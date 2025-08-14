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
import { BulkMemberIdUpload } from "./BulkMemberIdUpload";
import { MemberIdFormatSettings } from "./MemberIdFormatSettings";

type ValidMemberId = {
  id: string;
  member_id: string;
  created_at: string;
};

export default function ValidMemberIdManagement() {
  const { toast } = useToast();
  const [newMemberId, setNewMemberId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: validMemberIds, refetch } = useQuery({
    queryKey: ["valid-member-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("valid_member_ids")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ValidMemberId[];
    },
  });

  const handleAddMemberId = async () => {
    if (!newMemberId.trim()) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("valid_member_ids")
        .insert([{ member_id: newMemberId.trim() }]);

      if (error) throw error;

      setNewMemberId("");
      await refetch();
      toast({
        title: "Clave de socio agregada",
        description: "La clave de socio ha sido agregada exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar la clave de socio.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMemberId = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("valid_member_ids")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await refetch();
      toast({
        title: "Clave de socio eliminada",
        description: "La clave de socio ha sido eliminada exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la clave de socio.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuración de formato */}
      <MemberIdFormatSettings />
      
      {/* Carga masiva */}
      <BulkMemberIdUpload onSuccess={refetch} />
      
      {/* Agregar individual */}
      <div className="flex gap-4">
        <Input
          placeholder="Nueva clave de socio"
          value={newMemberId}
          onChange={(e) => setNewMemberId(e.target.value)}
          className="max-w-xs"
        />
        <Button
          onClick={handleAddMemberId}
          disabled={loading || !newMemberId.trim()}
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar clave
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Clave de socio</TableHead>
            <TableHead>Fecha de creación</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {validMemberIds?.map((memberId) => (
            <TableRow key={memberId.id}>
              <TableCell>{memberId.member_id}</TableCell>
              <TableCell>
                {new Date(memberId.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteMemberId(memberId.id)}
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