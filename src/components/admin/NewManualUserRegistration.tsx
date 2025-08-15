import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Search, CheckCircle } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

type UserRegistrationData = {
  full_name: string;
  member_id: string;
  email: string;
  password: string;
  phone: string;
};

interface NewManualUserRegistrationProps {
  onSuccess?: () => void;
}

export default function NewManualUserRegistration({ onSuccess }: NewManualUserRegistrationProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [memberValidated, setMemberValidated] = useState(false);
  const [validatingMember, setValidatingMember] = useState(false);
  
  const { toast } = useToast();
  
  const form = useForm<UserRegistrationData>({
    defaultValues: {
      full_name: "",
      member_id: "",
      email: "",
      password: "",
      phone: ""
    }
  });
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = form;
  const watchedMemberId = watch("member_id");

  const validateMemberId = async () => {
    if (!watchedMemberId?.trim()) {
      toast({
        title: "Error",
        description: "Ingresa una clave de socio para validar",
        variant: "destructive",
      });
      return;
    }

    try {
      setValidatingMember(true);
      setMemberValidated(false);
      
      const { data, error } = await supabase
        .from("valid_member_ids")
        .select("member_id")
        .eq("member_id", watchedMemberId.trim())
        .single();

      if (error || !data) {
        toast({
          title: "Clave inválida",
          description: "La clave de socio no existe en el sistema",
          variant: "destructive",
        });
        setMemberValidated(false);
        return;
      }

      setMemberValidated(true);
      toast({
        title: "Clave válida",
        description: "La clave de socio es válida",
      });
    } catch (error) {
      console.error("Error validating member ID:", error);
      toast({
        title: "Error",
        description: "Error al validar la clave de socio",
        variant: "destructive",
      });
      setMemberValidated(false);
    } finally {
      setValidatingMember(false);
    }
  };

  const createUserDirectly = async (data: UserRegistrationData) => {
    console.log("🚀 Creating user directly with data:", {
      full_name: data.full_name,
      email: data.email,
      member_id: data.member_id
    });

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        member_id: data.member_id,
        phone: data.phone
      }
    });

    if (authError) {
      console.error("❌ Auth creation error:", authError);
      throw new Error(`Error creando usuario: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("No se pudo crear el usuario en el sistema de autenticación");
    }

    console.log("✅ User created in auth:", authData.user.id);

    // 2. Crear perfil completo
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: authData.user.id,
        full_name: data.full_name,
        member_id: data.member_id,
        phone: data.phone
      });

    if (profileError) {
      console.error("❌ Profile creation error:", profileError);
      // Eliminar usuario de auth si falló el perfil
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Error creando perfil: ${profileError.message}`);
    }

    console.log("✅ Profile created successfully");

    // 3. Asignar rol de usuario
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: 'user'
      });

    if (roleError) {
      console.error("❌ Role assignment error:", roleError);
      // No eliminar usuario por esto, solo advertir
      console.warn("⚠️ Role assignment failed but user was created");
    } else {
      console.log("✅ Role assigned successfully");
    }

    return {
      user_id: authData.user.id,
      email: data.email,
      full_name: data.full_name
    };
  };

  const onSubmit = async (data: UserRegistrationData) => {
    if (!memberValidated) {
      toast({
        title: "Error",
        description: "Primero debes validar la clave de socio",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log("🎯 Starting user registration process...");

      // Verificar si el email ya existe
      try {
        const { data: existingUsersResponse } = await supabase.auth.admin.listUsers();
        
        if (existingUsersResponse?.users && Array.isArray(existingUsersResponse.users)) {
          const existingUser = existingUsersResponse.users.find((user: any) => 
            user.email && user.email.toLowerCase() === data.email.toLowerCase()
          );
          if (existingUser) {
            throw new Error("Ya existe un usuario con este correo electrónico");
          }
        }
      } catch (checkErr: any) {
        // Si es el error que esperamos (usuario duplicado), re-lanzarlo
        if (checkErr.message?.includes("Ya existe un usuario")) {
          throw checkErr;
        }
        console.warn("Could not check for existing users:", checkErr);
        // Para otros errores, continuar con el proceso
      }

      // Crear usuario directamente
      const result = await createUserDirectly(data);
      
      console.log("✅ Registration completed:", result);
      
      toast({
        title: "¡Usuario creado exitosamente!",
        description: `${data.full_name} ha sido registrado y puede acceder al sistema.`,
      });

      // Limpiar formulario y cerrar dialog
      reset();
      setMemberValidated(false);
      setShowDialog(false);
      
      // Callback de éxito
      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error("❌ Registration failed:", error);
      toast({
        title: "Error en el registro",
        description: error.message || "No se pudo registrar el usuario",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    reset();
    setMemberValidated(false);
    setValidatingMember(false);
    setIsLoading(false);
  };

  const handleOpenDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    resetForm();
    setShowDialog(false);
  };

  return (
    <>
      <Button onClick={handleOpenDialog} className="bg-primary hover:bg-primary/90">
        <UserPlus className="h-4 w-4 mr-2" />
        Registro Manual de Usuario
      </Button>

      <Dialog open={showDialog} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registro Manual de Usuario</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Validación de Clave de Socio */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Label htmlFor="member_id" className="text-base font-semibold">
                    1. Validar Clave de Socio *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="member_id"
                      {...register("member_id", { required: "La clave de socio es requerida" })}
                      placeholder="Ej: 422"
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={validateMemberId}
                      disabled={validatingMember || !watchedMemberId || isLoading}
                      className="min-w-[120px]"
                    >
                      {validatingMember ? (
                        "Validando..."
                      ) : memberValidated ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Válida
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Validar
                        </>
                      )}
                    </Button>
                  </div>
                  {errors.member_id && (
                    <p className="text-sm text-red-600">{errors.member_id.message}</p>
                  )}
                  {memberValidated && (
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Clave de socio validada correctamente
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información del Usuario */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">2. Información del Usuario</Label>
                  
                  <div>
                    <Label htmlFor="full_name">Nombre Completo *</Label>
                    <Input
                      id="full_name"
                      {...register("full_name", { required: "El nombre completo es requerido" })}
                      placeholder="Ej: Juan Pérez García"
                      disabled={isLoading}
                    />
                    {errors.full_name && (
                      <p className="text-sm text-red-600 mt-1">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Correo Electrónico *</Label>
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
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      {...register("phone")}
                      placeholder="+52 55 1234 5678"
                      disabled={isLoading}
                    />
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
                      disabled={isLoading}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseDialog}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !memberValidated}
                className="min-w-[150px]"
              >
                {isLoading ? "Registrando..." : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}