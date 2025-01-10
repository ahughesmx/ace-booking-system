import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { UserCog, Phone, IdCard, User, Shield, Edit2, UserPlus, AlertCircle, LayoutGrid, List, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type UserRole = Database["public"]["Enums"]["user_role"];

type User = {
  id: string;
  full_name: string | null;
  member_id: string | null;
  phone: string | null;
  role: UserRole;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

      const usersWithRoles = profiles.map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        member_id: profile.member_id,
        phone: profile.phone,
        role: roles.find((r) => r.user_id === profile.id)?.role || "user",
      }));

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

  const handleEditUser = async (userId: string, data: Partial<User>) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          member_id: data.member_id,
          phone: data.phone,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Usuario actualizado",
        description: "La información del usuario ha sido actualizada correctamente.",
      });

      setIsDialogOpen(false);
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

  const EditUserDialog = ({ user }: { user: User }) => {
    const [formData, setFormData] = useState({
      full_name: user.full_name || "",
      member_id: user.member_id || "",
      phone: user.phone || "",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleEditUser(user.id, formData);
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
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
          >
            Cancelar
          </Button>
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    );
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

  const renderGridView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredUsers.map((user) => (
        <div
          key={user.id}
          className="group relative overflow-hidden rounded-lg border bg-card p-6 transition-all hover:shadow-md"
        >
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
                {editingUser && <EditUserDialog user={editingUser} />}
              </DialogContent>
            </Dialog>
            <Button
              variant={user.role === "user" ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() =>
                updateUserRole(
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

  const renderListView = () => (
    <div className="space-y-4">
      {filteredUsers.map((user) => (
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
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
                {editingUser && <EditUserDialog user={editingUser} />}
              </DialogContent>
            </Dialog>
            <Button
              variant={user.role === "user" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                updateUserRole(
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
          searchTerm ? (
            <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No se encontraron usuarios</p>
              <p className="text-sm text-muted-foreground">
                No hay resultados para "{searchTerm}"
              </p>
            </div>
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay usuarios registrados</p>
              <p className="text-sm text-muted-foreground">
                Los usuarios aparecerán aquí cuando se registren en la plataforma
              </p>
            </div>
          )
        ) : viewMode === 'grid' ? (
          renderGridView()
        ) : (
          renderListView()
        )}
      </CardContent>
    </Card>
  );
}
