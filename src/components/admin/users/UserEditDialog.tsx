import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Mail, Lock, Shield } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

interface UserEditDialogProps {
  user: {
    id: string;
    full_name: string | null;
    member_id: string | null;
    phone: string | null;
    role: UserRole;
    email?: string | null;
  };
  onSubmit: (userId: string, data: any) => Promise<void>;
}

export const UserEditDialog = ({ user, onSubmit }: UserEditDialogProps) => {
  console.log("📝 UserEditDialog Debug - User data:", {
    id: user.id,
    full_name: user.full_name,
    phone: user.phone,
    email: user.email,
    phone_type: typeof user.phone
  });
  
  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    member_id: user.member_id || "",
    phone: user.phone || "",
    email: user.email || "",
    new_password: "",
    role: user.role || "user",
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(user.id, formData);
  };

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <div className="pr-6 mr-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información básica */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Información del perfil
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          </div>

          <Separator />

          {/* Información de autenticación */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Credenciales de acceso
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email de usuario
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Nueva contraseña (opcional)
              </Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showPassword ? "text" : "password"}
                  value={formData.new_password}
                  onChange={(e) =>
                    setFormData({ ...formData, new_password: e.target.value })
                  }
                  placeholder="Dejar vacío para no cambiar"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 6 caracteres. Dejar vacío para mantener la contraseña actual.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Rol del usuario
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-md z-50">
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define los permisos de acceso del usuario en el sistema.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button type="submit">Guardar cambios</Button>
          </div>
        </form>
      </div>
    </div>
  );
};