import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

type User = {
  id: string;
  full_name: string | null;
  member_id: string | null;
  role: UserRole;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, member_id");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles.map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        member_id: profile.member_id,
        role: roles.find((r) => r.user_id === profile.id)?.role || "user",
      }));

      setUsers(usersWithRoles);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <p>Cargando usuarios...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Usuarios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No hay usuarios registrados.
            </p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded"
              >
                <div>
                  <p className="font-medium">
                    {user.full_name || "Usuario sin nombre"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user.member_id
                      ? `Clave de socio: ${user.member_id}`
                      : "Sin clave de socio"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Rol actual: {user.role}
                  </p>
                </div>
                <div className="space-x-2">
                  <Button
                    variant={user.role === "user" ? "outline" : "default"}
                    onClick={() =>
                      updateUserRole(
                        user.id,
                        user.role === "user" ? "admin" : "user"
                      )
                    }
                  >
                    {user.role === "user" ? "Hacer Admin" : "Quitar Admin"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}