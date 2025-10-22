import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User,
  CreditCard,
  Mail,
  Phone,
  Clock,
  UserCheck,
  UserX,
  Search
} from "lucide-react";

interface RegistrationRequest {
  id: string;
  member_id: string;
  full_name: string;
  phone: string;
  email: string;
  password_provided?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  processed_at?: string;
  processed_by?: string;
  is_membership_holder?: boolean;
}

interface ProcessedRequestsProps {
  requests: RegistrationRequest[];
  allFilteredRequests: RegistrationRequest[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: 'all' | 'approved' | 'rejected';
  onStatusFilterChange: (filter: 'all' | 'approved' | 'rejected') => void;
}

export default function ProcessedRequests({
  requests,
  allFilteredRequests,
  currentPage,
  totalPages,
  onPageChange,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange
}: ProcessedRequestsProps) {
  // Calculate counts from all filtered requests (not just current page)
  const allProcessedRequests = allFilteredRequests.filter(request => request.status !== 'pending');
  const approvedCount = allProcessedRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = allProcessedRequests.filter(r => r.status === 'rejected').length;
  
  // Display the paginated requests from props
  const processedRequests = requests;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><UserCheck className="w-3 h-3 mr-1" />Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><UserX className="w-3 h-3 mr-1" />Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, email o clave de socio..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as 'all' | 'approved' | 'rejected')}>
            <TabsList>
              <TabsTrigger value="all">
                Todas <Badge variant="secondary" className="ml-1">{allProcessedRequests.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approved">
                Aprobadas <Badge variant="secondary" className="ml-1">{approvedCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rechazadas <Badge variant="secondary" className="ml-1">{rejectedCount}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {processedRequests.length === 0 ? (
        <div className="text-center py-8">
          <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchTerm ? "No se encontraron solicitudes procesadas." : "No hay solicitudes procesadas."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {processedRequests.map((request) => (
              <Card key={request.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-4">
                        <h3 className="font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {request.full_name}
                        </h3>
                        {getStatusBadge(request.status)}
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
                          Solicitud: {new Date(request.created_at).toLocaleDateString('es-MX')}
                        </div>
                        {request.processed_at && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Procesado: {new Date(request.processed_at).toLocaleDateString('es-MX')}
                          </div>
                        )}
                      </div>

                      {request.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-800">
                            <strong>Motivo del rechazo:</strong> {request.rejection_reason}
                          </p>
                        </div>
                      )}
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
    </div>
  );
}