import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Search } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";

type UserRegistrationData = {
  full_name: string;
  member_id: string;
  email: string;
  phone: string;
};

interface ManualUserRegistrationProps {
  onSuccess?: () => void;
}

export default function ManualUserRegistration({ onSuccess }: ManualUserRegistrationProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [consultingMember, setConsultingMember] = useState(false);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  
  const { toast } = useToast();
  
  // Crear el formulario con valores vacíos siempre
  const form = useForm<UserRegistrationData>({
    mode: "onChange",
    defaultValues: {
      full_name: "",
      member_id: "",
      email: "",
      phone: ""
    },
    shouldUnregister: true,
  });
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = form;

  const watchedMemberId = watch("member_id");

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

  const onSubmit = async (data: UserRegistrationData) => {
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

      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "No tienes sesión activa. Por favor inicia sesión nuevamente.",
          variant: "destructive",
        });
        return;
      }

      // Check for existing registration request with same phone
      const { data: existingRequest, error: checkRequestError } = await supabase
        .from("user_registration_requests")
        .select("id, status, full_name")
        .eq("phone", data.phone)
        .eq("status", "pending")
        .single();

      if (existingRequest && !checkRequestError) {
        toast({
          title: "Solicitud duplicada",
          description: `Ya existe una solicitud pendiente para el teléfono ${data.phone} (${existingRequest.full_name})`,
          variant: "destructive",
        });
        return;
      }

      // Check if user already exists with this phone and member_id
      const { data: existingProfile, error: checkProfileError } = await supabase
        .from("profiles")
        .select("id, full_name, member_id")
        .eq("phone", data.phone)
        .eq("member_id", data.member_id)
        .single();

      if (existingProfile && !checkProfileError) {
        toast({
          title: "Usuario ya registrado",
          description: `El teléfono ${data.phone} ya está registrado para ${existingProfile.full_name} con la clave ${data.member_id}`,
          variant: "destructive",
        });
        return;
      }

      // Create registration request - password will be set during approval
      const { data: requestData, error: registrationError } = await supabase
        .from("user_registration_requests")
        .insert({
          full_name: data.full_name,
          member_id: data.member_id,
          email: data.email,
          phone: data.phone,
          send_password_reset: true,
          status: "pending"
        })
        .select()
        .single();

      if (registrationError) {
        console.error("Registration request error:", registrationError);
        throw registrationError;
      }

      console.log("Registration request created:", requestData);

      // Automatically approve the request since it's manual registration by operator
      const { data: approvalData, error: approvalError } = await supabase.functions.invoke('process-registration-request', {
        body: {
          requestId: requestData.id,
          action: 'approve'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (approvalError) {
        console.error("Auto-approval error:", approvalError);
        toast({
          title: "Usuario creado, requiere aprobación",
          description: `La solicitud fue creada exitosamente pero requiere aprobación manual. Error: ${approvalError.message}`,
          variant: "default",
        });
      } else {
        console.log("Auto-approval successful:", approvalData);
        toast({
          title: "¡Éxito!",
          description: "Usuario registrado y aprobado automáticamente.",
        });
      }

      // Reset form and close dialog
      resetForm();
      setShowDialog(false);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
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

  const resetForm = () => {
    form.reset({
      full_name: "",
      member_id: "",
      email: "",
      phone: ""
    });
    setMemberInfo(null);
    setConsultingMember(false);
    setRegistrationLoading(false);
  };

  const handleOpenDialog = () => {
    console.log("🔍 Opening dialog - resetting form");
    resetForm(); // Always reset when opening
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    console.log("🔍 Closing dialog - resetting form");
    resetForm(); // Reset when closing
    setShowDialog(false);
  };

  return (
    <>
      <Button onClick={handleOpenDialog}>
        <UserPlus className="h-4 w-4 mr-2" />
        Añadir Usuario Manualmente
      </Button>

      <Dialog 
        open={showDialog} 
        onOpenChange={(open) => {
          console.log("🔍 Dialog onOpenChange:", open);
          if (!open) {
            handleCloseDialog();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registro Manual de Usuario</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Nota de seguridad:</strong> El usuario recibirá un correo electrónico para establecer su propia contraseña de forma segura.
              </p>
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
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
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