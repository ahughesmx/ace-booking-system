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
import PendingRequests from "./registration/PendingRequests";
import ProcessedRequests from "./registration/ProcessedRequests";
import NewManualUserRegistration from "./NewManualUserRegistration";

interface RegistrationRequest {
  id: string;
  member_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  password_provided?: boolean; // Nuevo campo para indicar si se proporcionó contraseña
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  processed_at?: string;
  processed_by?: string;
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
  
  // Pagination and search state
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const [processedCurrentPage, setProcessedCurrentPage] = useState(1);
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [processedSearchTerm, setProcessedSearchTerm] = useState("");
  const itemsPerPage = 5;
  
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
      const updatePayload: any = {
        full_name: updatedData.full_name,
        email: updatedData.email,
        phone: updatedData.phone,
        member_id: updatedData.member_id,
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

  // Filtered requests
  const pendingRequests = requests.filter(request => request.status === 'pending');
  const processedRequests = requests.filter(request => request.status !== 'pending');
  
  const filteredPendingRequests = filterRequests(pendingRequests, pendingSearchTerm);
  const filteredProcessedRequests = filterRequests(processedRequests, processedSearchTerm);
  
  const paginatedPendingRequests = getPaginatedRequests(filteredPendingRequests, pendingCurrentPage);
  const paginatedProcessedRequests = getPaginatedRequests(filteredProcessedRequests, processedCurrentPage);
  
  const pendingTotalPages = getTotalPages(filteredPendingRequests.length);
  const processedTotalPages = getTotalPages(filteredProcessedRequests.length);

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
              Solicitudes Pendientes ({filteredPendingRequests.length})
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
              onUpdate={handleUpdate}
              currentPage={pendingCurrentPage}
              totalPages={pendingTotalPages}
              onPageChange={setPendingCurrentPage}
              searchTerm={pendingSearchTerm}
              onSearchChange={handlePendingSearchChange}
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

  // Original full component
  return (
    <>
      <NewManualUserRegistration onSuccess={fetchRequests} />

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            Solicitudes Pendientes ({filteredPendingRequests.length})
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
            onUpdate={handleUpdate}
            currentPage={pendingCurrentPage}
            totalPages={pendingTotalPages}
            onPageChange={setPendingCurrentPage}
            searchTerm={pendingSearchTerm}
            onSearchChange={handlePendingSearchChange}
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