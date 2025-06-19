
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/admin/AdminButton";
import { Check, X, Pencil, Trash2, Ban } from "lucide-react";
import { DisableCourtDialog } from "./DisableCourtDialog";

type Court = {
  id: string;
  name: string;
  court_type: string;
  created_at: string;
};

type CourtsListProps = {
  courts: Court[];
  onEditCourt: (courtId: string, newName: string) => Promise<void>;
  onDeleteCourt: (courtId: string) => Promise<void>;
  loading: boolean;
};

export function CourtsList({ courts, onEditCourt, onDeleteCourt, loading }: CourtsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  const startEditing = (court: Court) => {
    setEditingId(court.id);
    setEditName(court.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleDisableCourt = (court: Court) => {
    setSelectedCourt(court);
    setDisableDialogOpen(true);
  };

  const getCourtTypeLabel = (courtType: string) => {
    return courtType === 'tennis' ? 'Tenis' : 'Pádel';
  };

  return (
    <>
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-600">Nombre</TableHead>
                <TableHead className="font-semibold text-gray-600">Tipo</TableHead>
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
                  <TableCell className="text-gray-600">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      court.court_type === 'tennis' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {getCourtTypeLabel(court.court_type)}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(court.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col sm:flex-row gap-2 justify-end">
                      {editingId === court.id ? (
                        <>
                          <AdminButton
                            variant="outline"
                            size="sm"
                            onClick={() => onEditCourt(court.id, editName)}
                            disabled={loading || !editName.trim()}
                            icon={<Check className="w-4 h-4" />}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                            fullWidth
                          >
                            Guardar
                          </AdminButton>
                          <AdminButton
                            variant="outline"
                            size="sm"
                            onClick={cancelEditing}
                            disabled={loading}
                            icon={<X className="w-4 h-4" />}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-200"
                            fullWidth
                          >
                            Cancelar
                          </AdminButton>
                        </>
                      ) : (
                        <>
                          <AdminButton
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(court)}
                            disabled={loading}
                            icon={<Pencil className="w-4 h-4" />}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                            fullWidth
                          >
                            Editar
                          </AdminButton>
                          <AdminButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisableCourt(court)}
                            disabled={loading}
                            icon={<Ban className="w-4 h-4" />}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                            fullWidth
                          >
                            Inhabilitar
                          </AdminButton>
                          <AdminButton
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteCourt(court.id)}
                            disabled={loading}
                            icon={<Trash2 className="w-4 h-4" />}
                            fullWidth
                          >
                            Eliminar
                          </AdminButton>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <DisableCourtDialog
        court={selectedCourt}
        isOpen={disableDialogOpen}
        onClose={() => {
          setDisableDialogOpen(false);
          setSelectedCourt(null);
        }}
        onSuccess={() => {
          // Aquí podrías refetch la lista de canchas si necesario
        }}
      />
    </>
  );
}
