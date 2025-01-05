import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProfileFormData = {
  full_name: string;
  member_id: string;
};

export default function ProfileForm({ userId }: { userId: string }) {
  const { register, handleSubmit, setValue } = useForm<ProfileFormData>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  return (
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
  );
}