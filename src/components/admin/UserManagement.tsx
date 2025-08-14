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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
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
      
      // Get session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      // Call edge function to get users with auth data
      const { data, error } = await supabase.functions.invoke('get-users-with-auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('🔍 Edge function response:', { data, error });

      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ No data received from edge function');
        throw new Error('No data received from server');
      }

      if (!data.users) {
        console.error('❌ Invalid response structure:', data);
        throw new Error('Invalid response from server - missing users array');
      }

      console.log('✅ Users fetched from edge function:', data.users);
      
      setUsers(data.users);
      setFilteredUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios. Verifica que tengas permisos de administrador.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const { error } = await supabase.functions.invoke('manage-user-role', {
        body: {
          userId,
          role: newRole,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Error updating user role:", error);
        throw new Error("No se pudo actualizar el rol del usuario");
      }

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

      // Update role if provided using edge function
      if (data.role) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No session found');
        }

        const { error: roleError } = await supabase.functions.invoke('manage-user-role', {
          body: {
            userId,
            role: data.role,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (roleError) {
          console.error("Error updating user role:", roleError);
          throw new Error("No se pudo actualizar el rol del usuario");
        }
      }

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
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No session found');
        }

        const { data: authResult, error: authError } = await supabase.functions.invoke('update-user-auth', {
          body: {
            userId,
            ...authUpdates
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (authError) {
          console.error("Error updating auth information:", authError);
          toast({
            title: "Advertencia",
            description: "Perfil actualizado pero hubo un problema con email/contraseña.",
            variant: "destructive",
          });
        } else {
          console.log('✅ Auth updated successfully:', authResult);
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