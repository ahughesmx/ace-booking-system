import { User, Shield, IdCard, Phone, Edit2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";
import { UserEditDialog } from "./UserEditDialog";

type UserRole = Database["public"]["Enums"]["user_role"];

interface UserListProps {
  users: {
    id: string;
    full_name: string | null;
    member_id: string | null;
    phone: string | null;
    role: UserRole;
  }[];
  onEditUser: (userId: string, data: any) => Promise<void>;
  onUpdateRole: (userId: string, newRole: UserRole) => Promise<void>;
}

export const UserList = ({
  users,
  onEditUser,
  onUpdateRole,
}: UserListProps) => {
  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">
                {user.full_name || "Usuario sin nombre"}
              </h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <IdCard className="h-4 w-4" />
                  {user.member_id || "Sin clave"}
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {user.phone || "Sin teléfono"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge 
              variant={user.role === "admin" ? "default" : "secondary"}
            >
              {user.role === "admin" ? (
                <Shield className="mr-1 h-3 w-3" />
              ) : null}
              {user.role}
            </Badge>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Usuario</DialogTitle>
                </DialogHeader>
                <UserEditDialog user={user} onSubmit={onEditUser} />
              </DialogContent>
            </Dialog>
            <Button
              variant={user.role === "user" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                onUpdateRole(
                  user.id,
                  user.role === "user" ? "admin" : "user"
                )
              }
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {user.role === "user" ? "Hacer Admin" : "Quitar Admin"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};