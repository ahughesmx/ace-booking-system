
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { Upload, Search } from "lucide-react";

type UserRegistrationData = {
  full_name: string;
  member_id: string;
  email: string;
  password: string;
  phone: string;
};

export default function UserRegistrationForm() {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UserRegistrationData>();
  const [loading, setLoading] = useState(false);
  const [consultingMember, setConsultingMember] = useState(false);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [responsiveFile, setResponsiveFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const { toast } = useToast();

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
      setLoading(true);

      // Validate member ID exists
      if (!memberInfo) {
        toast({
          title: "Error",
          description: "Primero debes consultar y validar la clave de socio",
          variant: "destructive",
        });
        return;
      }

      // Create registration request instead of directly creating user
      const { error: registrationError } = await supabase
        .from("user_registration_requests")
        .insert({
          full_name: data.full_name,
          member_id: data.member_id,
          email: data.email,
          phone: data.phone,
          password_provided: true, // Flag that password was provided
          status: "pending"
        });

      if (registrationError) throw registrationError;

      // Handle file uploads if files were selected
      if (responsiveFile || idFile) {
        console.log("Files to upload:", { responsiveFile, idFile });
      }

      toast({
        title: "¡Éxito!",
        description: "Solicitud de registro enviada correctamente. El usuario será notificado cuando sea aprobado.",
      });

      // Reset form
      reset();
      setMemberInfo(null);
      setResponsiveFile(null);
      setIdFile(null);
    } catch (error: any) {
      console.error("Error registering user:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el usuario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de Nuevo Usuario</CardTitle>
      </CardHeader>
      <CardContent>
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
                {consultingMember ? "Consultando..." : "Consultar Socio"}
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

          <div>
            <Label htmlFor="responsive_file">Responsiva del Usuario</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="responsive_file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setResponsiveFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('responsive_file')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Responsiva
              </Button>
              {responsiveFile && (
                <span className="text-sm text-gray-600">{responsiveFile.name}</span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="id_file">Fotografía de Identificación Oficial</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="id_file"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('id_file')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir ID Oficial
              </Button>
              {idFile && (
                <span className="text-sm text-gray-600">{idFile.name}</span>
              )}
            </div>
          </div>

          <Button type="submit" disabled={loading || !memberInfo} className="w-full">
            {loading ? "Registrando..." : "Registrar Usuario"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
