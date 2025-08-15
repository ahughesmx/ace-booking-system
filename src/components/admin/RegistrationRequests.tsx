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
import ManualUserRegistration from "./ManualUserRegistration";

interface RegistrationRequest {
  id: string;
  member_id: string;
  full_name: string;
  phone: string;
  email: string;
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const { data, error } = await supabase.functions.invoke('process-registration-request', {
        body: {
          requestId,
          action,
          rejectionReason
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: action === 'approve' ? "Usuario Aprobado" : "Solicitud Rechazada",
        description: action === 'approve' 
          ? "El usuario ha sido creado y notificado por WhatsApp." 
          : "La solicitud ha sido rechazada y el usuario notificado.",
      });

      fetchRequests();
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      toast({
        title: "Error",
        description: `No se pudo ${action === 'approve' ? 'aprobar' : 'rechazar'} la solicitud.`,
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


  // Filter and paginate functions
  const filterRequests = (requests: RegistrationRequest[], searchTerm: string) => {
    if (!searchTerm) return requests;
    return requests.filter(request => 
      request.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.member_id.toLowerCase().includes(searchTerm.toLowerCase())
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
        <ManualUserRegistration onSuccess={fetchRequests} />

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
              currentPage={pendingCurrentPage}
              totalPages={pendingTotalPages}
              onPageChange={setPendingCurrentPage}
              searchTerm={pendingSearchTerm}
              onSearchChange={setPendingSearchTerm}
            />
          </TabsContent>
          
          <TabsContent value="processed" className="space-y-4">
            <ProcessedRequests
              requests={paginatedProcessedRequests}
              currentPage={processedCurrentPage}
              totalPages={processedTotalPages}
              onPageChange={setProcessedCurrentPage}
              searchTerm={processedSearchTerm}
              onSearchChange={setProcessedSearchTerm}
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
      <ManualUserRegistration onSuccess={fetchRequests} />

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
            currentPage={pendingCurrentPage}
            totalPages={pendingTotalPages}
            onPageChange={setPendingCurrentPage}
            searchTerm={pendingSearchTerm}
            onSearchChange={setPendingSearchTerm}
          />
        </TabsContent>
        
        <TabsContent value="processed" className="space-y-4">
          <ProcessedRequests
            requests={paginatedProcessedRequests}
            currentPage={processedCurrentPage}
            totalPages={processedTotalPages}
            onPageChange={setProcessedCurrentPage}
            searchTerm={processedSearchTerm}
            onSearchChange={setProcessedSearchTerm}
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