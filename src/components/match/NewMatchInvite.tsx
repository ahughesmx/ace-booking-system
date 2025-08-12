import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { UserSearch } from "@/components/UserSearch";

type NewMatchInviteProps = {
  matchId: string;
  currentUserId: string;
  isDoubles: boolean;
  position: "player2" | "player1_partner" | "player2_partner";
  bookingStartTime?: string;
};

export function NewMatchInvite({ 
  matchId, 
  currentUserId,
  isDoubles,
  position,
  bookingStartTime 
}: NewMatchInviteProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleInvite = async (recipientId: string) => {
    try {
      // Verificar si el usuario ya tiene un partido confirmado en esta fecha y hora
      if (bookingStartTime) {
        const { data: existingMatches } = await supabase
          .from("matches")
          .select(`
            id,
            booking:bookings!inner(start_time)
          `)
          .or(`player1_id.eq.${recipientId},player2_id.eq.${recipientId}`)
          .eq("booking.start_time", bookingStartTime)
          .eq("is_confirmed_player1", true)
          .eq("is_confirmed_player2", true);

        if (existingMatches && existingMatches.length > 0) {
          toast({
            title: "No se puede invitar",
            description: "El usuario ya tiene un partido confirmado en esta fecha y hora",
            variant: "destructive",
          });
          setOpen(false);
          return;
        }
      }
      
      // Crear la invitación
      const { error: invitationError } = await supabase
        .from('match_invitations')
        .insert([
          {
            match_id: matchId,
            sender_id: currentUserId,
            recipient_id: recipientId,
            status: 'pending'
          }
        ]);

      if (invitationError) {
        throw invitationError;
      }

      // Actualizar el match con el jugador invitado
      const updateData: Record<string, any> = {};
      updateData[position + '_id'] = recipientId;

      const { error: matchError } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      if (matchError) {
        throw matchError;
      }

      // Trigger match_invitation_sent webhook
      try {
        // Get match details with booking and players information
        const { data: matchDetails } = await supabase
          .from("matches")
          .select(`
            *,
            booking:bookings (
              id,
              start_time,
              end_time,
              court:courts (
                id,
                name,
                court_type
              )
            ),
            player1:profiles!player1_id (
              id,
              full_name,
              phone
            ),
            player2:profiles!player2_id (
              id,
              full_name,
              phone
            ),
            player1_partner:profiles!player1_partner_id (
              id,
              full_name,
              phone
            ),
            player2_partner:profiles!player2_partner_id (
              id,
              full_name,
              phone
            )
          `)
          .eq("id", matchId)
          .single();

        // Get recipient profile
        const { data: recipientProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", recipientId)
          .single();

        if (matchDetails && recipientProfile) {
          const webhookData = {
            match_id: matchId,
            invitation_id: null, // Will be set by the database
            sender_id: currentUserId,
            recipient_id: recipientId,
            recipient_name: recipientProfile.full_name,
            recipient_phone: recipientProfile.phone,
            remotejid: recipientProfile.phone,
            position: position,
            is_doubles: isDoubles,
            court_name: matchDetails.booking?.court?.name,
            court_type: matchDetails.booking?.court?.court_type,
            start_time: matchDetails.booking?.start_time,
            end_time: matchDetails.booking?.end_time,
            date: matchDetails.booking?.start_time ? 
              new Date(matchDetails.booking.start_time).toISOString().split('T')[0] : null,
            time: matchDetails.booking?.start_time ? 
              new Date(matchDetails.booking.start_time).toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
              }) : null,
            player1_name: matchDetails.player1?.full_name,
            player2_name: matchDetails.player2?.full_name,
            player1_partner_name: matchDetails.player1_partner?.full_name,
            player2_partner_name: matchDetails.player2_partner?.full_name
          };

          // Get active webhooks for match_invitation_sent
          const { data: webhooks } = await supabase
            .from("webhooks")
            .select("*")
            .eq("event_type", "match_invitation_sent")
            .eq("is_active", true);

          if (webhooks && webhooks.length > 0) {
            console.log(`🚀 Disparando ${webhooks.length} webhooks para match_invitation_sent`);
            for (const webhook of webhooks) {
              try {
                const customHeaders = webhook.headers as Record<string, string> || {};
                const headers: Record<string, string> = {
                  "Content-Type": "application/json",
                  ...customHeaders,
                };

                await fetch(webhook.url, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    event: "match_invitation_sent",
                    timestamp: new Date().toISOString(),
                    data: webhookData,
                    webhook_name: webhook.name
                  }),
                });

                console.log(`✅ Webhook ${webhook.name} disparado exitosamente para match_invitation_sent`);
              } catch (webhookError) {
                console.error(`❌ Error disparando webhook ${webhook.name}:`, webhookError);
              }
            }
          }
        }
      } catch (webhookError) {
        console.error("❌ Error procesando webhooks de invitación:", webhookError);
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