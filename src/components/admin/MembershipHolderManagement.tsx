import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Crown, UserCheck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMembershipManagement } from "@/hooks/use-membership-management";
import { useToast } from "@/hooks/use-toast";

interface MembershipGroup {
  member_id: string;
  members: {
    id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    is_membership_holder: boolean;
  }[];
}

export default function MembershipHolderManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const { updateMembershipHolder, isUpdatingHolder } = useMembershipManagement();
  const { toast } = useToast();

  const { data: membershipGroups, isLoading, refetch } = useQuery({
    queryKey: ["membershipGroups", searchTerm],
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
          is_membership_holder
        `)
        .not("member_id", "is", null)
        .order("member_id")
        .order("created_at");

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,member_id.ilike.%${searchTerm}%`);
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
          is_membership_holder: member.is_membership_holder || false
        });
      });

      return Object.values(groups);
    },
  });

  const handleChangeHolder = async (newHolderId: string, membershipId: string) => {
    try {
      await updateMembershipHolder({
        newHolderId,
        currentMemberId: membershipId
      });
      refetch();
    } catch (error) {
      console.error('Error changing membership holder:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando membresías...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o clave de socio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
                    {group.members.length} miembro(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        member.is_membership_holder 
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
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {member.is_membership_holder ? (
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
              {searchTerm ? "No se encontraron membresías" : "No hay membresías registradas"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}