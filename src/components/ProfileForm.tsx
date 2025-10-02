import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ProfileFormData = {
  full_name: string;
  member_id: string;
};

type AuthFormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function ProfileForm({ userId }: { userId: string }) {
  const { register, handleSubmit, setValue } = useForm<ProfileFormData>();
  const { register: registerAuth, handleSubmit: handleSubmitAuth, watch, reset: resetAuth } = useForm<AuthFormData>();
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const { toast } = useToast();
  
  const password = watch("password");

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, member_id")
          .eq("id", userId)
          .single();

        if (error) throw error;

        if (data) {
          setValue("full_name", data.full_name || "");
          setValue("member_id", data.member_id || "");
        }
        
        // Load current email
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          setCurrentEmail(user.email || "");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [userId, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          full_name: data.full_name,
          member_id: data.member_id,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Tu información ha sido guardada correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onAuthSubmit = async (data: AuthFormData) => {
    if (data.password && data.password !== data.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas no coinciden",
      });
      return;
    }
    
    if (data.password && data.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
      });
      return;
    }
    
    setAuthLoading(true);
    try {
      const updateData: { email?: string; password?: string } = {};
      
      if (data.email && data.email !== currentEmail) {
        updateData.email = data.email;
      }
      
      if (data.password) {
        updateData.password = data.password;
      }
      
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "Sin cambios",
          description: "No hay datos para actualizar",
        });
        return;
      }
      
      const { error } = await supabase.auth.updateUser(updateData);
      
      if (error) throw error;
      
      if (updateData.email) {
        setCurrentEmail(updateData.email);
      }
      
      resetAuth();
      
      toast({
        title: "Credenciales actualizadas",
        description: updateData.email 
          ? "Tu correo ha sido actualizado. Usa el nuevo correo en tu próximo inicio de sesión." 
          : "Tu contraseña ha sido actualizada. Usa la nueva contraseña en tu próximo inicio de sesión.",
      });
    } catch (error: any) {
      console.error("Error updating auth credentials:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron actualizar las credenciales",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Tu perfil</CardTitle>
          <CardDescription>
            Actualiza tu información personal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                {...register("full_name", { required: true })}
                placeholder="Juan Pérez"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member_id">Clave de socio</Label>
              <Input
                id="member_id"
                {...register("member_id", { required: true })}
                placeholder="Ingresa tu clave de socio"
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Guardando..." : "Guardar perfil"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credenciales de acceso</CardTitle>
          <CardDescription>
            Actualiza tu correo electrónico o contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitAuth(onAuthSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder={currentEmail || "correo@ejemplo.com"}
                {...registerAuth("email")}
                disabled={authLoading}
              />
              <p className="text-sm text-muted-foreground">
                Correo actual: {currentEmail}
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Dejar en blanco para no cambiar"
                {...registerAuth("password")}
                disabled={authLoading}
              />
              <p className="text-sm text-muted-foreground">
                Mínimo 6 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirmar nueva contraseña"
                {...registerAuth("confirmPassword")}
                disabled={authLoading}
              />
            </div>

            <Button type="submit" disabled={authLoading} className="w-full">
              {authLoading ? "Actualizando..." : "Actualizar credenciales"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}