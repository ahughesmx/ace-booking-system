import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  UserCheck, 
  UserX, 
  Clock, 
  Phone, 
  Mail, 
  User,
  CreditCard,
  UserPlus,
  Search,
  Upload
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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

type UserRegistrationData = {
  full_name: string;
  member_id: string;
  email: string;
  password: string;
  phone: string;
};

export default function RegistrationRequests() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showManualRegistration, setShowManualRegistration] = useState(false);
  const [consultingMember, setConsultingMember] = useState(false);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UserRegistrationData>();
  
  const watchedMemberId = watch("member_id");

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

  const consultMember = async () => {
    if (!watchedMemberId) {
      toast({
        title: "Error",
        description: "Ingresa una clave de socio para consultar",
        variant: "destructive",
      });
      return;
    }

    try {
      setConsultingMember(true);
      
      const { data: validMember, error } = await supabase
        .from("valid_member_ids")
        .select("*")
        .eq("member_id", watchedMemberId)
        .single();

      if (error || !validMember) {
        toast({
          title: "Clave no encontrada",
          description: "La clave de socio no existe en el sistema",
          variant: "destructive",
        });
        setMemberInfo(null);
        return;
      }

      setMemberInfo(validMember);
      toast({
        title: "Clave válida",
        description: "La clave de socio es válida y puede usarse para registro",
      });
    } catch (error) {
      console.error("Error consulting member:", error);
      toast({
        title: "Error",
        description: "Error al consultar la clave de socio",
        variant: "destructive",
      });
    } finally {
      setConsultingMember(false);
    }
  };

  const onSubmitManualRegistration = async (data: UserRegistrationData) => {
    try {
      setRegistrationLoading(true);

      // Validate member ID exists
      if (!memberInfo) {
        toast({
          title: "Error",
          description: "Primero debes consultar y validar la clave de socio",
          variant: "destructive",
        });
        return;
      }

      // Create registration request
      const { error: registrationError } = await supabase
        .from("user_registration_requests")
        .insert({
          full_name: data.full_name,
          member_id: data.member_id,
          email: data.email,
          phone: data.phone,
          password_provided: true,
          status: "pending"
        });

      if (registrationError) throw registrationError;

      toast({
        title: "¡Éxito!",
        description: "Solicitud de registro creada correctamente. Será procesada automáticamente.",
      });

      // Reset form and close dialog
      reset();
      setMemberInfo(null);
      setShowManualRegistration(false);
      fetchRequests(); // Refresh the list
    } catch (error: any) {
      console.error("Error registering user:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la solicitud de registro",
        variant: "destructive",
      });
    } finally {
      setRegistrationLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><UserCheck className="w-3 h-3 mr-1" />Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><UserX className="w-3 h-3 mr-1" />Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-6 w-6" />
            Solicitudes de Registro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <div className="h-4 w-48 rounded bg-gray-200" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-6 w-6" />
              Solicitudes de Registro
            </div>
            <Button onClick={() => setShowManualRegistration(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Añadir Usuario Manualmente
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay solicitudes de registro.</p>
            </div>
          ) : (
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
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Socio: {request.member_id}
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

                        {request.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-800">
                              <strong>Motivo del rechazo:</strong> {request.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>

                      {request.status === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.id)}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Manual Registration Dialog */}
      <Dialog open={showManualRegistration} onOpenChange={setShowManualRegistration}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registro Manual de Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitManualRegistration)} className="space-y-4">
            <div>
              <Label htmlFor="member_id">Número de Socio *</Label>
              <div className="flex gap-2">
                <Input
                  id="member_id"
                  {...register("member_id", { required: "El número de socio es requerido" })}
                  placeholder="12345"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={consultMember}
                  disabled={consultingMember || !watchedMemberId}
                >
                  <Search className="w-4 h-4 mr-2" />
                  {consultingMember ? "Consultando..." : "Consultar"}
                </Button>
              </div>
              {errors.member_id && (
                <p className="text-sm text-red-600 mt-1">{errors.member_id.message}</p>
              )}
              {memberInfo && (
                <p className="text-sm text-green-600 mt-1">✓ Clave de socio válida</p>
              )}
            </div>

            <div>
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                {...register("full_name", { required: "El nombre completo es requerido" })}
                placeholder="Juan Pérez García"
              />
              {errors.full_name && (
                <p className="text-sm text-red-600 mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Correo Electrónico (Usuario) *</Label>
              <Input
                id="email"
                type="email"
                {...register("email", { 
                  required: "El correo electrónico es requerido",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Correo electrónico inválido"
                  }
                })}
                placeholder="juan@ejemplo.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                {...register("password", { 
                  required: "La contraseña es requerida",
                  minLength: {
                    value: 6,
                    message: "La contraseña debe tener al menos 6 caracteres"
                  }
                })}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Número Telefónico *</Label>
              <Input
                id="phone"
                {...register("phone", { required: "El número telefónico es requerido" })}
                placeholder="+52 55 1234 5678"
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowManualRegistration(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={registrationLoading || !memberInfo}>
                {registrationLoading ? "Registrando..." : "Crear Solicitud"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}