import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Alert, AlertDescription } from "@/components/ui/alert";

type NewMatchInviteProps = {
  matchId: string;
  currentUserId: string;
  isDoubles: boolean;
  position: 'player2' | 'player1_partner' | 'player2_partner';
};

export function NewMatchInvite({ 
  matchId, 
  currentUserId, 
  isDoubles, 
  position 
}: NewMatchInviteProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: availablePlayers } = useQuery({
    queryKey: ["available-players", matchId],
    queryFn: async () => {
      // Obtener jugadores que no están ya en el partido
      const { data: match } = await supabase
        .from("matches")
        .select("player1_id, player2_id, player1_partner_id, player2_partner_id")
        .eq("id", matchId)
        .single();

      if (!match) throw new Error("Match not found");

      const existingPlayerIds = [
        match.player1_id,
        match.player2_id,
        match.player1_partner_id,
        match.player2_partner_id
      ].filter(Boolean);

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .not("id", "in", `(${existingPlayerIds.join(",")})`)
        .neq("id", currentUserId)
        .order("full_name");

      if (error) throw error;
      return profiles;
    },
  });

  const handleInvite = async () => {
    try {
      setError(null);
      setIsSubmitting(true);

      // 1. Crear la invitación
      const { error: inviteError } = await supabase
        .from("match_invitations")
        .insert({
          match_id: matchId,
          sender_id: currentUserId,
          recipient_id: selectedUserId,
          status: "pending"
        });

      if (inviteError) throw inviteError;

      // 2. Actualizar el partido con el jugador pendiente
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
        description: "El jugador ha sido invitado al partido.",
      });

      setOpen(false);
      setSelectedUserId("");
    } catch (err) {
      console.error("Error sending invitation:", err);
      setError("No se pudo enviar la invitación. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const positionLabels = {
    player2: "Jugador 2",
    player1_partner: "Compañero Jugador 1",
    player2_partner: "Compañero Jugador 2"
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Invitar {positionLabels[position]}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar Jugador</DialogTitle>
          <DialogDescription>
            Selecciona un jugador para invitar como {positionLabels[position].toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Select
            value={selectedUserId}
            onValueChange={setSelectedUserId}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar jugador" />
            </SelectTrigger>
            <SelectContent>
              {availablePlayers?.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleInvite} 
            disabled={!selectedUserId || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Enviando..." : "Enviar Invitación"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}