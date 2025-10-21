import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface User {
  id: string;
  full_name: string | null;
  member_id: string | null;
  phone: string | null;
  deactivated_at?: Date | null;
}

interface DeleteInactiveUsersDialogProps {
  open: boolean;
  users: User[];
  onConfirm: (userIds: string[]) => Promise<void>;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteInactiveUsersDialog = ({ 
  open, 
  users, 
  onConfirm, 
  onCancel,
  isDeleting = false 
}: DeleteInactiveUsersDialogProps) => {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    if (!confirmed) return;
    
    const userIds = users.map(u => u.id);
    await onConfirm(userIds);
    setConfirmed(false);
  };

  const handleCancel = () => {
    setConfirmed(false);
    onCancel();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleCancel}>
      <AlertDialogContent className="max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Usuarios Inactivos Permanentemente
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                ⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE
              </p>
              <ul className="text-sm space-y-1 ml-6 list-disc">
                <li>Los usuarios serán eliminados <strong>permanentemente</strong> del sistema</li>
                <li>Se eliminarán sus perfiles, roles y registros asociados</li>
                <li>Se eliminarán sus solicitudes de registro aprobadas</li>
                <li>No se puede deshacer esta operación</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">Usuarios a eliminar: {users.length}</p>
                <Badge variant="destructive">{users.length} usuarios</Badge>
              </div>
              
              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Clave de Socio</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Fecha Desactivación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || 'Sin nombre'}
                        </TableCell>
                        <TableCell>{user.member_id || 'N/A'}</TableCell>
                        <TableCell>{user.phone || 'N/A'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {user.deactivated_at 
                            ? format(new Date(user.deactivated_at), "dd/MM/yyyy HH:mm", { locale: es })
                            : 'N/A'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="flex items-start space-x-2 bg-muted p-4 rounded-lg">
              <Checkbox 
                id="confirm-delete" 
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                disabled={isDeleting}
              />
              <Label 
                htmlFor="confirm-delete" 
                className="text-sm font-medium leading-tight cursor-pointer"
              >
                Confirmo que entiendo que esta es una eliminación permanente e irreversible.
                Los usuarios y sus datos asociados serán eliminados definitivamente del sistema.
              </Label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!confirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar Permanentemente
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
