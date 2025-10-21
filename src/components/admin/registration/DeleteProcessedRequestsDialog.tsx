import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface RegistrationRequest {
  id: string;
  member_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  processed_at?: string;
}

interface DeleteProcessedRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: RegistrationRequest[];
  onConfirm: (requestIds: string[]) => Promise<void>;
}

export default function DeleteProcessedRequestsDialog({
  open,
  onOpenChange,
  requests,
  onConfirm,
}: DeleteProcessedRequestsDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      const requestIds = requests.map(r => r.id);
      await onConfirm(requestIds);
      onOpenChange(false);
      setConfirmed(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Solicitudes Procesadas (Agosto y Septiembre)
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="font-semibold text-destructive mb-2">
                ⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE
              </p>
              <p className="text-sm text-muted-foreground">
                Se eliminarán permanentemente <strong>{requests.length} solicitudes procesadas</strong> en agosto y septiembre de 2024 de la base de datos.
                Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Solicitudes a eliminar:</p>
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Nombre</th>
                      <th className="text-left p-2">Socio</th>
                      <th className="text-left p-2">Estado</th>
                      <th className="text-left p-2">Procesado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.id} className="border-t">
                        <td className="p-2">{request.full_name}</td>
                        <td className="p-2">{request.member_id}</td>
                        <td className="p-2">
                          <span className={request.status === 'approved' ? 'text-green-600' : 'text-red-600'}>
                            {request.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                          </span>
                        </td>
                        <td className="p-2">
                          {request.processed_at ? new Date(request.processed_at).toLocaleDateString('es-MX') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-start space-x-2 bg-muted p-3 rounded-lg">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <Label
                htmlFor="confirm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Confirmo que entiendo que esta eliminación es permanente e irreversible
              </Label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setConfirmed(false);
            }}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!confirmed || isDeleting}
          >
            {isDeleting ? "Eliminando..." : `Eliminar ${requests.length} solicitudes`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
