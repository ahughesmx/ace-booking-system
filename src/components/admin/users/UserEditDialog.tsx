import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

interface UserEditDialogProps {
  user: {
    id: string;
    full_name: string | null;
    member_id: string | null;
    phone: string | null;
    role: UserRole;
  };
  onSubmit: (userId: string, data: any) => Promise<void>;
}

export const UserEditDialog = ({ user, onSubmit }: UserEditDialogProps) => {
  console.log("📝 UserEditDialog Debug - User data:", {
    id: user.id,
    full_name: user.full_name,
    phone: user.phone,
    phone_type: typeof user.phone
  });
  
  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    member_id: user.member_id || "",
    phone: user.phone || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(user.id, formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input
          id="full_name"
          value={formData.full_name}
          onChange={(e) =>
            setFormData({ ...formData, full_name: e.target.value })
          }
          placeholder="Juan Pérez"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="member_id">Clave de socio</Label>
        <Input
          id="member_id"
          value={formData.member_id}
          onChange={(e) =>
            setFormData({ ...formData, member_id: e.target.value })
          }
          placeholder="Ingresa la clave de socio"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) =>
            setFormData({ ...formData, phone: e.target.value })
          }
          placeholder="Ingresa el teléfono"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit">Guardar cambios</Button>
      </div>
    </form>
  );
};