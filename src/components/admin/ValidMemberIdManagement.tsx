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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, Search } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: validMemberIds, refetch } = useQuery({
    queryKey: ["valid-member-ids", searchTerm, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("valid_member_ids")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.ilike("member_id", `%${searchTerm}%`);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      return { 
        data: data as ValidMemberId[], 
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      };
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

      {/* Listado con búsqueda y paginación */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Claves de Socio</CardTitle>
          <div className="flex items-center gap-2 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clave de socio..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clave de socio</TableHead>
                <TableHead>Fecha de creación</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validMemberIds?.data?.map((memberId) => (
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
              {validMemberIds?.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {searchTerm ? "No se encontraron claves que coincidan con la búsqueda" : "No hay claves de socio registradas"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Paginación */}
          {validMemberIds && validMemberIds.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, validMemberIds.totalCount)} de {validMemberIds.totalCount} registros
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: validMemberIds.totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      const showPage = page === 1 || 
                                     page === validMemberIds.totalPages || 
                                     Math.abs(page - currentPage) <= 1;
                      return showPage;
                    })
                    .map((page, index, arr) => (
                      <PaginationItem key={page}>
                        {index > 0 && arr[index - 1] < page - 1 && (
                          <PaginationEllipsis />
                        )}
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, validMemberIds.totalPages))}
                      className={currentPage === validMemberIds.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}