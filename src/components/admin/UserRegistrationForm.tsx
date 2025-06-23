
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { Upload } from "lucide-react";

type UserRegistrationData = {
  full_name: string;
  member_id: string;
  email: string;
  password: string;
  phone: string;
};

export default function UserRegistrationForm() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserRegistrationData>();
  const [loading, setLoading] = useState(false);
  const [responsiveFile, setResponsiveFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const { toast } = useToast();

  const onSubmit = async (data: UserRegistrationData) => {
    try {
      setLoading(true);

      // First, validate that the member_id exists in valid_member_ids
      const { data: validMemberId, error: validationError } = await supabase
        .from("valid_member_ids")
        .select("id")
        .eq("member_id", data.member_id)
        .single();

      if (validationError || !validMemberId) {
        toast({
          title: "Error",
          description: "La clave de socio no es válida",
          variant: "destructive",
        });
        return;
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            member_id: data.member_id,
            phone: data.phone,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with additional data
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: data.full_name,
            member_id: data.member_id,
            phone: data.phone,
          })
          .eq("id", authData.user.id);

        if (profileError) throw profileError;

        // Handle file uploads if files were selected
        if (responsiveFile || idFile) {
          // Note: File upload functionality would require Supabase Storage setup
          // For now, we'll just log that files were provided
          console.log("Files to upload:", { responsiveFile, idFile });
        }

        toast({
          title: "¡Éxito!",
          description: "Usuario registrado correctamente",
        });

        // Reset form
        reset();
        setResponsiveFile(null);
        setIdFile(null);
      }
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
            <Label htmlFor="member_id">Número de Socio *</Label>
            <Input
              id="member_id"
              {...register("member_id", { required: "El número de socio es requerido" })}
              placeholder="12345"
            />
            {errors.member_id && (
              <p className="text-sm text-red-600 mt-1">{errors.member_id.message}</p>
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

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Registrando..." : "Registrar Usuario"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
