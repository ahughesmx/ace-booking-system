import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import PendingRequests from "./registration/PendingRequests";
import ProcessedRequests from "./registration/ProcessedRequests";
import NewManualUserRegistration from "./NewManualUserRegistration";

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


interface RegistrationRequestsProps {
  showOnlyButton?: boolean;
  showOnlyTabs?: boolean;
}

export default function RegistrationRequests({ showOnlyButton = false, showOnlyTabs = false }: RegistrationRequestsProps) {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Edit dialog state
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    member_id: '',
    password: '',
    is_membership_holder: false
  });
  
  // Pagination and search state
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const [processedCurrentPage, setProcessedCurrentPage] = useState(1);
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [processedSearchTerm, setProcessedSearchTerm] = useState("");
  const itemsPerPage = 5;
  const [showMigrationPending, setShowMigrationPending] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("user_registration_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests((data || []) as RegistrationRequest[]);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes de registro.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processRequest = async (requestId: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    try {
      console.log(`Processing request ${requestId} with action: ${action}`);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa. Por favor inicia sesión nuevamente.');
      }

      console.log("Calling process-registration-request function...");
      
      const { data, error } = await supabase.functions.invoke('process-registration-request', {
        body: {
          requestId,
          action,
          rejectionReason
        }
      });

      if (error) {
        console.error("Function invocation error:", error);
        throw error;
      }

      console.log("Function response:", data);

      toast({
        title: action === 'approve' ? "Usuario Aprobado" : "Solicitud Rechazada",
        description: action === 'approve' 
          ? "El usuario ha sido creado y aprobado exitosamente." 
          : "La solicitud ha sido rechazada.",
      });

      // Refresh the requests list
      await fetchRequests();
      
    } catch (error: any) {
      console.error(`Error ${action}ing request:`, error);
      
      // Determinar el mensaje de error apropiado
      let errorMessage = error.message || `No se pudo ${action === 'approve' ? 'aprobar' : 'rechazar'} la solicitud.`;
      
      // Personalizar mensaje para errores específicos
      if (error.message?.includes("Esta clave de socio no está disponible o no pertenece a su familia")) {
        errorMessage = "Esta clave de socio ya está siendo utilizada por otra familia. El apellido del solicitante no coincide con los miembros existentes de esta membresía.";
      } else if (error.message?.includes("Member ID not available")) {
        errorMessage = "La clave de socio especificada no es válida o ya está en uso por otra familia.";
      }
      
      toast({
        title: "No se puede aprobar la solicitud",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleApprove = (requestId: string) => {
    // Buscar la solicitud para validar el teléfono
    const request = requests.find(r => r.id === requestId);
    
    if (!request) {
      toast({
        title: "Error",
        description: "No se encontró la solicitud.",
        variant: "destructive",
      });
      return;
    }

    // Validar que exista el teléfono
    if (!request.phone || request.phone.trim() === '') {
      toast({
        title: "Teléfono requerido",
        description: "El usuario debe tener un número de teléfono registrado antes de aprobar la solicitud.",
        variant: "destructive",
      });
      return;
    }

    // Limpiar el teléfono de espacios y validar
    const cleanPhone = request.phone.replace(/\s/g, '');
    
    // Validar que solo contenga números
    if (!/^\d+$/.test(cleanPhone)) {
      toast({
        title: "Teléfono inválido",
        description: "El teléfono debe contener solo números, sin espacios, guiones o caracteres especiales. Por favor edita la solicitud antes de aprobarla.",
        variant: "destructive",
      });
      return;
    }

    // Validar que tenga exactamente 10 dígitos
    if (cleanPhone.length !== 10) {
      toast({
        title: "Teléfono inválido",
        description: `El teléfono debe tener exactamente 10 dígitos. El teléfono actual tiene ${cleanPhone.length} dígitos. Por favor edita la solicitud antes de aprobarla.`,
        variant: "destructive",
      });
      return;
    }

    // Si todas las validaciones pasan, procesar la aprobación
    processRequest(requestId, 'approve');
  };

  const handleReject = (requestId: string) => {
    setSelectedRequest(requestId);
    setShowRejectDialog(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Debes proporcionar un motivo del rechazo.",
        variant: "destructive",
      });
      return;
    }

    await processRequest(selectedRequest, 'reject', rejectionReason);
    setShowRejectDialog(false);
    setRejectionReason("");
    setSelectedRequest("");
  };

  const handleUpdate = async (requestId: string, updatedData: any) => {
    try {
      // Limpiar y validar el teléfono si se proporcionó
      let cleanedPhone = updatedData.phone;
      if (cleanedPhone) {
        cleanedPhone = cleanedPhone.replace(/\s/g, ''); // Eliminar espacios
        
        // Validar que solo contenga números
        if (!/^\d+$/.test(cleanedPhone)) {
          toast({
            title: "Teléfono inválido",
            description: "El teléfono debe contener solo números, sin espacios, guiones o caracteres especiales.",
            variant: "destructive",
          });
          return;
        }

        // Validar que tenga exactamente 10 dígitos
        if (cleanedPhone.length !== 10) {
          toast({
            title: "Teléfono inválido",
            description: `El teléfono debe tener exactamente 10 dígitos. El teléfono actual tiene ${cleanedPhone.length} dígitos.`,
            variant: "destructive",
          });
          return;
        }
      }

      const updatePayload: any = {
        full_name: updatedData.full_name,
        email: updatedData.email,
        phone: cleanedPhone,
        member_id: updatedData.member_id,
        is_membership_holder: updatedData.is_membership_holder || false,
        updated_at: new Date().toISOString()
      };

      // Only include password if provided
      if (updatedData.password && updatedData.password.trim()) {
        updatePayload.password = updatedData.password;
      }

      const { error } = await supabase
        .from('user_registration_requests')
        .update(updatePayload)
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      toast({
        title: "Solicitud actualizada",
        description: "Los datos de la solicitud han sido actualizados correctamente.",
      });

      // Refresh the requests list
      await fetchRequests();

    } catch (error: any) {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la solicitud.",
        variant: "destructive",
      });
    }
  };

  // Open edit dialog
  const handleEdit = (requestId: string) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    setEditingRequestId(requestId);
    setEditForm({
      full_name: req.full_name || '',
      email: req.email || '',
      phone: req.phone || '',
      member_id: req.member_id || '',
      password: '',
      is_membership_holder: req.is_membership_holder || false
    });
  };

  useEffect(() => {
    if (!editingRequestId) return;
    const req = requests.find(r => r.id === editingRequestId);
    if (req) {
      setEditForm(prev => ({
        ...prev,
        full_name: req.full_name || '',
        email: req.email || '',
        phone: req.phone || '',
        member_id: req.member_id || '',
        is_membership_holder: req.is_membership_holder || false
      }));
    }
  }, [editingRequestId, requests]);

  const handleSaveEdit = async () => {
    if (!editingRequestId) return;
    await handleUpdate(editingRequestId, editForm);
    setEditingRequestId(null);
  };

  // Handle search term changes and reset pagination
  const handlePendingSearchChange = (value: string) => {
    setPendingSearchTerm(value);
    setPendingCurrentPage(1); // Reset to first page when searching
  };

  const handleProcessedSearchChange = (value: string) => {
    setProcessedSearchTerm(value);
    setProcessedCurrentPage(1); // Reset to first page when searching
  };

  // Filter and paginate functions
  const filterRequests = (requests: RegistrationRequest[], searchTerm: string) => {
    if (!searchTerm) return requests;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return requests.filter(request => 
      request.full_name.toLowerCase().includes(lowerSearchTerm) ||
      (request.email?.toLowerCase() || '').includes(lowerSearchTerm) ||
      request.member_id.toLowerCase().includes(lowerSearchTerm) ||
      (request.phone?.toLowerCase() || '').includes(lowerSearchTerm)
    );
  };

  const getPaginatedRequests = (requests: RegistrationRequest[], currentPage: number) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return requests.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number) => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const sortByMemberId = (requests: RegistrationRequest[]) => {
    return [...requests].sort((a, b) => {
      const memberIdA = a.member_id || '';
      const memberIdB = b.member_id || '';
      return memberIdA.localeCompare(memberIdB, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

// Filtered requests
  const basePending = requests.filter(request => request.status === 'pending');
  const processedRequests = requests.filter(request => request.status !== 'pending');
  
  const searchedPending = filterRequests(basePending, pendingSearchTerm);
  const filteredProcessedRequests = filterRequests(processedRequests, processedSearchTerm);
  
  const visiblePending = showMigrationPending 
    ? searchedPending 
    : searchedPending.filter((r) => !r.is_migration);
  
  // Sort before pagination
  const sortedPending = sortByMemberId(visiblePending);
  const sortedProcessed = sortByMemberId(filteredProcessedRequests);
  
  const paginatedPendingRequests = getPaginatedRequests(sortedPending, pendingCurrentPage);
  const paginatedProcessedRequests = getPaginatedRequests(sortedProcessed, processedCurrentPage);
  
  const pendingTotalPages = getTotalPages(sortedPending.length);
  const processedTotalPages = getTotalPages(sortedProcessed.length);

  if (loading) {
    return (
      <Button disabled>
        Cargando...
      </Button>
    );
  }

  // Show only button when requested
  if (showOnlyButton) {
    return (
      <>
        <NewManualUserRegistration onSuccess={fetchRequests} />

        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechazar Solicitud de Registro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Motivo del Rechazo</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Explica el motivo del rechazo..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmReject}>
                Rechazar Solicitud
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show only tabs when requested
  if (showOnlyTabs) {
    return (
      <>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
              Solicitudes Pendientes ({visiblePending.length})
            </TabsTrigger>
            <TabsTrigger value="processed">
              Solicitudes Procesadas ({filteredProcessedRequests.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4">
            <PendingRequests
              requests={paginatedPendingRequests}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={handleEdit}
              currentPage={pendingCurrentPage}
              totalPages={pendingTotalPages}
              onPageChange={setPendingCurrentPage}
              searchTerm={pendingSearchTerm}
              onSearchChange={handlePendingSearchChange}
              showMigrationRequests={showMigrationPending}
              onToggleMigration={setShowMigrationPending}
            />
          </TabsContent>
          
          <TabsContent value="processed" className="space-y-4">
            <ProcessedRequests
              requests={paginatedProcessedRequests}
              currentPage={processedCurrentPage}
              totalPages={processedTotalPages}
              onPageChange={setProcessedCurrentPage}
              searchTerm={processedSearchTerm}
              onSearchChange={handleProcessedSearchChange}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={!!showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechazar Solicitud de Registro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Motivo del Rechazo</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Explica el motivo del rechazo..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmReject}>
                Rechazar Solicitud
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingRequestId} onOpenChange={(open) => !open && setEditingRequestId(null)}>
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

      </>
    );
  }
}