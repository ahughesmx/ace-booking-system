import { useState } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";
import type { Match } from "@/types/match";

type AdminMatchControlsProps = {
  match: Match;
  onUpdateResult: (matchId: string, player1Sets: number, player2Sets: number) => void;
  onDeleteMatch: (matchId: string) => void;
};

export function AdminMatchControls({ match, onUpdateResult, onDeleteMatch }: AdminMatchControlsProps) {
  const [player1Sets, setPlayer1Sets] = useState<string>("");
  const [player2Sets, setPlayer2Sets] = useState<string>("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <div className="flex gap-2 mt-4">
      <Dialog>
        <DialogTrigger asChild>
          <AdminButton
            variant="outline"
            size="sm"
            icon={<Pencil className="h-4 w-4" />}
            fullWidth
          >
            Editar
          </AdminButton>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Resultado (Admin)</DialogTitle>
            <DialogDescription>
              Como administrador, puedes editar los resultados en cualquier momento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Sets {match.player1?.full_name || "Jugador 1"}
                </label>
                <Input
                  type="number"
                  min="0"
                  max="3"
                  value={player1Sets}
                  onChange={(e) => setPlayer1Sets(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Sets {match.player2?.full_name || "Jugador 2"}
                </label>
                <Input
                  type="number"
                  min="0"
                  max="3"
                  value={player2Sets}
                  onChange={(e) => setPlayer2Sets(e.target.value)}
                />
              </div>
            </div>
            <AdminButton 
              onClick={() => {
                onUpdateResult(match.id, parseInt(player1Sets), parseInt(player2Sets));
                setPlayer1Sets("");
                setPlayer2Sets("");
              }}
              fullWidth
            >
              Guardar Resultado
            </AdminButton>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogTrigger asChild>
          <AdminButton
            variant="destructive"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            fullWidth
          >
            Eliminar
          </AdminButton>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar este partido? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <AdminButton 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </AdminButton>
            <AdminButton
              variant="destructive"
              onClick={() => {
                onDeleteMatch(match.id);
                setIsDeleteDialogOpen(false);
              }}
            >
              Eliminar
            </AdminButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}