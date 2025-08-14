import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { UserCog, Search, LayoutGrid, List } from "lucide-react";
import { UserCard } from "./users/UserCard";
import { UserList } from "./users/UserList";
import { EmptyUserState } from "./users/EmptyUserState";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

type User = {
  id: string;
  full_name: string | null;
  member_id: string | null;
  phone: string | null;
  role: UserRole;
  email?: string | null;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.member_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, member_id, phone");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get auth users to obtain emails (simplified approach)
      let authUsers: any[] = [];
      try {
        const { data } = await supabase.auth.admin.listUsers();
        authUsers = data?.users || [];
      } catch (authError) {
        console.warn("No se pudo obtener información de autenticación:", authError);
      }

      const usersWithRoles = profiles.map((profile) => {
        const authUser = authUsers.find((u: any) => u.id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          member_id: profile.member_id,
          phone: profile.phone,
          role: roles.find((r) => r.user_id === profile.id)?.role || "user",
          email: authUser?.email || null,
        };
      });

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .upsert({
          user_id: userId,
          role: newRole,
        });

      if (error) throw error;

      toast({
        title: "Rol actualizado",
        description: "El rol del usuario ha sido actualizado correctamente.",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol del usuario.",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async (userId: string, data: Partial<User & { new_password?: string }>) => {
    try {
      // Update profile information
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          member_id: data.member_id,
          phone: data.phone,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Update auth information if provided
      const authUpdates: any = {};
      
      if (data.email && data.email.trim() !== '') {
        authUpdates.email = data.email;
      }
      
      if (data.new_password && data.new_password.length >= 6) {
        authUpdates.password = data.new_password;
      }

      // Only make auth update if there are auth changes
      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          userId,
          authUpdates
        );

        if (authError) {
          console.error("Error updating auth information:", authError);
          toast({
            title: "Advertencia",
            description: "Perfil actualizado pero hubo un problema con email/contraseña. Verifica los permisos de administrador.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Usuario actualizado",
        description: "La información del usuario ha sido actualizada correctamente.",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la información del usuario.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            Gestión de Usuarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <div className="h-4 w-48 rounded bg-gray-200" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            Gestión de Usuarios
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-[250px]"
              />
            </div>
            <div className="flex items-center gap-2 border rounded-lg p-1">
              <Toggle
                pressed={viewMode === 'grid'}
                onPressedChange={() => setViewMode('grid')}
                aria-label="Vista en cuadrícula"
                className="data-[state=on]:bg-muted"
              >
                <LayoutGrid className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={viewMode === 'list'}
                onPressedChange={() => setViewMode('list')}
                aria-label="Vista en lista"
                className="data-[state=on]:bg-muted"
              >
                <List className="h-4 w-4" />
              </Toggle>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
          <EmptyUserState searchTerm={searchTerm} />
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onEditUser={handleEditUser}
                onUpdateRole={updateUserRole}
              />
            ))}
          </div>
        ) : (
          <UserList
            users={filteredUsers}
            onEditUser={handleEditUser}
            onUpdateRole={updateUserRole}
          />
        )}
      </CardContent>
    </Card>
  );
}