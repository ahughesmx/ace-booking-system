import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

type MatchInviteDialogProps = {
  matchId: string;
  currentUserId: string;
  isDoubles: boolean;
  position: 'player2' | 'player1_partner' | 'player2_partner';
};

export function MatchInviteDialog({ matchId, currentUserId, isDoubles, position }: MatchInviteDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .neq("id", currentUserId);

      if (error) throw error;
      return data;
    },
  });

  const handleInvite = async () => {
    try {
      // Create invitation
      const { error: inviteError } = await supabase
        .from("match_invitations")
        .insert({
          match_id: matchId,
          sender_id: currentUserId,
          recipient_id: selectedUserId,
          status: "pending",
        });

      if (inviteError) throw inviteError;

      // Update match with pending player
      const updateData = {
        [position]: selectedUserId,
      };

      const { error: matchError } = await supabase
        .from("matches")
        .update(updateData)
        .eq("id", matchId);

      if (matchError) throw matchError;

      toast({
        title: "Invitación enviada",
        description: "Se ha enviado la invitación al jugador seleccionado.",
      });

      setIsOpen(false);
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar la invitación. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Invitar Jugador
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar Jugador</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select
            value={selectedUserId}
            onValueChange={(value) => setSelectedUserId(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar jugador" />
            </SelectTrigger>
            <SelectContent>
              {profiles?.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={!selectedUserId}>
            Enviar Invitación
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}