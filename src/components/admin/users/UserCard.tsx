import { User, Shield, IdCard, Phone, Edit2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";
import { UserEditDialog } from "./UserEditDialog";

type UserRole = Database["public"]["Enums"]["user_role"];

interface UserCardProps {
  user: {
    id: string;
    full_name: string | null;
    member_id: string | null;
    phone: string | null;
    role: UserRole;
  };
  onEditUser: (userId: string, data: any) => Promise<void>;
  onUpdateRole: (userId: string, newRole: UserRole) => Promise<void>;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  setEditingUser: (user: any) => void;
}

export const UserCard = ({
  user,
  onEditUser,
  onUpdateRole,
  isDialogOpen,
  setIsDialogOpen,
  setEditingUser,
}: UserCardProps) => {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card p-6 transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">
              {user.full_name || "Usuario sin nombre"}
            </h3>
            <Badge 
              variant={user.role === "admin" ? "default" : "secondary"}
              className="mt-1"
            >
              {user.role === "admin" ? (
                <Shield className="mr-1 h-3 w-3" />
              ) : null}
              {user.role}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <IdCard className="h-4 w-4" />
          {user.member_id ? (
            <span>{user.member_id}</span>
          ) : (
            <span className="italic">Sin clave de socio</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          {user.phone ? (
            <span>{user.phone}</span>
          ) : (
            <span className="italic">Sin teléfono</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setEditingUser(user)}
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
          className="w-full"
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
  );
};