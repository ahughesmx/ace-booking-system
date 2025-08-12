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

        // Get recipient and sender profiles
        const { data: recipientProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", selectedUserId)
          .single();

        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUserId)
          .single();

        if (matchDetails && recipientProfile && senderProfile) {
          console.log('🔍 Match details for webhook:', {
            matchId,
            player1: matchDetails.player1,
            player2: matchDetails.player2,
            player1_partner: matchDetails.player1_partner,
            player2_partner: matchDetails.player2_partner,
            booking: matchDetails.booking,
            recipient: recipientProfile,
            sender: senderProfile
          });

          const webhookData = {
            match_id: matchId,
            invitation_id: null, // Will be set by the database
            sender_id: currentUserId,
            sender_name: senderProfile.full_name,
            sender_phone: senderProfile.phone,
            recipient_id: selectedUserId,
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
            player1_phone: matchDetails.player1?.phone,
            player2_name: matchDetails.player2?.full_name,
            player2_phone: matchDetails.player2?.phone,
            player1_partner_name: matchDetails.player1_partner?.full_name,
            player1_partner_phone: matchDetails.player1_partner?.phone,
            player2_partner_name: matchDetails.player2_partner?.full_name,
            player2_partner_phone: matchDetails.player2_partner?.phone
          };

          console.log('📤 Webhook payload:', JSON.stringify(webhookData, null, 2));

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