import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ProfileFormData = {
  full_name: string;
  member_id: string;
};

export default function ProfileForm({ userId }: { userId: string }) {
  const { register, handleSubmit } = useForm<ProfileFormData>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          full_name: data.full_name,
          member_id: data.member_id,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input
          id="full_name"
          {...register("full_name", { required: true })}
          placeholder="Juan Pérez"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="member_id">Clave de socio</Label>
        <Input
          id="member_id"
          {...register("member_id", { required: true })}
          placeholder="Ingresa tu clave de socio"
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar perfil"}
      </Button>
    </form>
  );
}