import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  User,
  CreditCard,
  Mail,
  Phone,
  Clock,
  UserCheck,
  UserX,
  Search,
  Edit,
  Database
} from "lucide-react";

interface RegistrationRequest {
  id: string;
  member_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  password_provided?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  processed_at?: string;
  processed_by?: string;
  is_migration?: boolean;
  is_membership_holder?: boolean;
}

interface PendingRequestsProps {
  requests: RegistrationRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onUpdate: (requestId: string, updatedData: any) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showMigrationRequests: boolean;
  onToggleMigration: (checked: boolean) => void;
}

export default function PendingRequests({
  requests,
  onApprove,
  onReject,
  onUpdate,
  currentPage,
  totalPages,
  onPageChange,
  searchTerm,
  onSearchChange,
  showMigrationRequests,
  onToggleMigration
}: PendingRequestsProps) {
  const { toast } = useToast();
  const [editingRequest, setEditingRequest] = useState<RegistrationRequest | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    member_id: '',
    password: '',
    is_membership_holder: false
  });

const handleEditClick = (request: RegistrationRequest) => {
  console.log('[PendingRequests] Editar solicitud', { id: request.id, is_migration: request.is_migration });
  setEditingRequest(request);
  setEditForm({
    full_name: request.full_name || '',
    email: request.email || '',
    phone: request.phone || '',
    member_id: request.member_id || '',
    password: '',
    is_membership_holder: request.is_membership_holder || false
  });
};

  const handleSaveEdit = async () => {
    if (!editingRequest) return;
    
    try {
      await onUpdate(editingRequest.id, editForm);
      setEditingRequest(null);
      toast({
        title: "Solicitud actualizada",
        description: "Los datos de la solicitud han sido actualizados correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, email o clave de socio..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-migration"
            checked={showMigrationRequests}
            onCheckedChange={(checked) => onToggleMigration(checked === true)}
          />
          <Label htmlFor="show-migration" className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4" />
            Mostrar solicitudes de migración
          </Label>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8">
          <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchTerm ? "No se encontraron solicitudes pendientes." : "No hay solicitudes pendientes."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-4">
                        <h3 className="font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {request.full_name}
                        </h3>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendiente
                          </Badge>
                          {request.is_migration && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              <Database className="w-3 h-3 mr-1" />
                              Migración
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Socio: {request.member_id}
                          {request.is_membership_holder && (
                            <Badge variant="outline" className="ml-2 text-blue-600 border-blue-600">
                              Titular
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {request.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {request.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {new Date(request.created_at).toLocaleDateString('es-MX')}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(request)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onApprove(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onReject(request.id)}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialog de edición fuera del map para evitar que desaparezca con el filtrado */}
      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nombre Completo</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="member_id">Clave de Socio</Label>
              <Input
                id="member_id"
                value={editForm.member_id}
                onChange={(e) => setEditForm(prev => ({ ...prev, member_id: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="password">Nueva Contraseña (opcional)</Label>
              <Input
                id="password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Dejar vacío para mantener la actual"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_membership_holder"
                checked={editForm.is_membership_holder}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_membership_holder: checked }))}
              />
              <Label htmlFor="is_membership_holder">Es titular de membresía</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveEdit} className="flex-1">
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}