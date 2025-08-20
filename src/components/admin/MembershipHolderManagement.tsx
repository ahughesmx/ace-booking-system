import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, UserCheck, UserX, UserPlus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMembershipManagement } from "@/hooks/use-membership-management";
import { useToast } from "@/hooks/use-toast";
import SearchInput from "./SearchInput";

interface MembershipGroup {
  member_id: string;
  members: {
    id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    is_membership_holder: boolean;
    is_active: boolean;
    deactivated_at: string | null;
  }[];
}

const MembershipHolderManagement = () => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const { updateMembershipHolder, reactivateMember, isUpdatingHolder, isReactivating } = useMembershipManagement();
  const { toast } = useToast();

  // Callback para manejar cambios del SearchInput
  const handleSearchChange = useCallback((searchTerm: string) => {
    setDebouncedSearchTerm(searchTerm);
  }, []);

  const { data: membershipGroups, isLoading, refetch } = useQuery({
    queryKey: ["membershipGroups", debouncedSearchTerm],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          member_id,
          phone,
          avatar_url,
          created_at,
          is_membership_holder,
          is_active,
          deactivated_at
        `)
        .not("member_id", "is", null)
        .order("member_id")
        .order("created_at");

      if (debouncedSearchTerm) {
        query = query.or(`full_name.ilike.%${debouncedSearchTerm}%,member_id.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por member_id
      const groups: Record<string, MembershipGroup> = {};
      
      data?.forEach(member => {
        if (!member.member_id) return;
        
        if (!groups[member.member_id]) {
          groups[member.member_id] = {
            member_id: member.member_id,
            members: []
          };
        }
        
        groups[member.member_id].members.push({
          id: member.id,
          full_name: member.full_name,
          phone: member.phone,
          avatar_url: member.avatar_url,
          created_at: member.created_at,
          is_membership_holder: member.is_membership_holder || false,
          is_active: member.is_active || false,
          deactivated_at: member.deactivated_at
        });
      });

      return Object.values(groups);
    },
  });

  // Memorizar funciones para evitar re-renders
  const handleReactivateMember = useCallback(async (memberId: string) => {
    try {
      await reactivateMember(memberId);
      refetch();
    } catch (error) {
      console.error('Error reactivating member:', error);
    }
  }, [reactivateMember, refetch]);

  const handleChangeHolder = useCallback(async (newHolderId: string, membershipId: string) => {
    try {
      await updateMembershipHolder({
        newHolderId,
        currentMemberId: membershipId
      });
      refetch();
    } catch (error) {
      console.error('Error changing membership holder:', error);
    }
  }, [updateMembershipHolder, refetch]);

  if (isLoading) {
    return <div className="text-center py-8">Cargando membresías...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <SearchInput 
          placeholder="Buscar por nombre o clave de socio..."
          onDebouncedChange={handleSearchChange}
        />
      </div>

      <div className="space-y-4">
        {membershipGroups?.map((group) => {
          const currentHolder = group.members.find(m => m.is_membership_holder);
          
          return (
            <Card key={group.member_id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Membresía: {group.member_id}
                  <Badge variant="secondary">
                    {group.members.filter(m => m.is_active).length} activo(s) | {group.members.filter(m => !m.is_active).length} inactivo(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        !member.is_active 
                          ? 'bg-muted/50 border-muted opacity-70'
                          : member.is_membership_holder 
                            ? 'bg-primary/5 border-primary/20' 
                            : 'bg-card/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.full_name
                              ? member.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">
                            {member.full_name || "Nombre no disponible"}
                          </h4>
                          {member.phone && (
                            <p className="text-sm text-muted-foreground">
                              Tel: {member.phone}
                            </p>
                          )}
                          {!member.is_active && member.deactivated_at && (
                            <p className="text-xs text-muted-foreground">
                              Desactivado: {new Date(member.deactivated_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!member.is_active ? (
                          <>
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              <UserX className="h-3 w-3 mr-1" />
                              Inactivo
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isReactivating}
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Reactivar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Reactivar miembro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Estás a punto de reactivar a <strong>{member.full_name}</strong>.
                                    <br/><br/>
                                    El usuario recuperará acceso completo a su cuenta y podrá usar todas las funcionalidades del sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleReactivateMember(member.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Reactivar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : member.is_membership_holder ? (
                          <Badge variant="default" className="bg-primary">
                            <Crown className="h-3 w-3 mr-1" />
                            Titular
                          </Badge>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isUpdatingHolder}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Hacer titular
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Cambiar titular de membresía?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Estás a punto de hacer a <strong>{member.full_name}</strong> el nuevo titular de la membresía <strong>{group.member_id}</strong>.
                                  <br/><br/>
                                  {currentHolder && (
                                    <>
                                      <strong>{currentHolder.full_name}</strong> dejará de ser el titular y perderá los permisos para gestionar otros miembros de la membresía.
                                    </>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleChangeHolder(member.id, group.member_id)}
                                >
                                  Cambiar titular
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {membershipGroups?.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {debouncedSearchTerm ? "No se encontraron membresías" : "No hay membresías registradas"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Usar React.memo para evitar re-renders innecesarios
export default React.memo(MembershipHolderManagement);