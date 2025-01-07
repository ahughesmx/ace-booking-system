import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase-client";
import { UserSearch } from "../UserSearch";

type NewMatchInviteProps = {
  matchId: string;
  currentUserId: string;
  isDoubles: boolean;
  position: "player2" | "player1_partner" | "player2_partner";
};

export function NewMatchInvite({ 
  matchId, 
  currentUserId,
  isDoubles,
  position 
}: NewMatchInviteProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleInvite = async (recipientId: string) => {
    try {
      console.log("Enviando invitación...", { matchId, recipientId, position });
      
      // Primero crear la invitación
      const { data: invitationData, error: invitationError } = await supabase
        .from('match_invitations')
        .insert([
          {
            match_id: matchId,
            sender_id: currentUserId,
            recipient_id: recipientId,
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (invitationError) {
        throw invitationError;
      }

      // Luego actualizar el match con el jugador invitado
      const updateData: Record<string, any> = {};
      updateData[position + '_id'] = recipientId;

      const { error: matchError } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      if (matchError) {
        throw matchError;
      }

      toast({
        title: "Invitación enviada",
        description: "Se ha enviado la invitación al jugador",
      });

      setOpen(false);
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo enviar la invitación",
      });
    }
  };

  const getButtonText = () => {
    switch (position) {
      case "player2":
        return "Invitar Oponente";
      case "player1_partner":
        return "Invitar Compañero";
      case "player2_partner":
        return "Invitar Compañero del Oponente";
      default:
        return "Invitar Jugador";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{getButtonText()}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar Jugador</DialogTitle>
        </DialogHeader>
        <UserSearch
          onSelect={handleInvite}
          excludeIds={[currentUserId]}
        />
      </DialogContent>
    </Dialog>
  );
}