import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { MatchInvitation } from "@/types/match-invitation";
import { InvitationList } from "./InvitationList";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { useInvitations } from "./useInvitations";

export const MatchInvitationNotification = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<MatchInvitation | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: pendingInvitations = [], refetch } = useInvitations(user?.id);

  useEffect(() => {
    const channel = supabase
      .channel('match-invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_invitations',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    const matchesChannel = supabase
      .channel('matches')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(matchesChannel);
    };
  }, [refetch]);

  const handleInvitationResponse = async (accept: boolean) => {
    if (!selectedInvitation) return;

    try {
      if (accept && selectedInvitation.match?.booking?.start_time) {
        const { data: conflictingInvitations, error: fetchError } = await supabase
          .from("match_invitations")
          .select(`
            id,
            match:matches (
              booking:bookings (
                start_time
              )
            )
          `)
          .eq("recipient_id", user?.id)
          .eq("status", "pending")
          .neq("id", selectedInvitation.id);

        if (fetchError) throw fetchError;

        const invitationsToReject = conflictingInvitations.filter(invitation => {
          return invitation.match?.booking?.start_time === selectedInvitation.match?.booking?.start_time;
        });

        if (invitationsToReject.length > 0) {
          const { error: rejectError } = await supabase
            .from("match_invitations")
            .update({ status: "rejected" })
            .in("id", invitationsToReject.map(inv => inv.id));

          if (rejectError) throw rejectError;
        }

        // Actualizar el estado de confirmación en el partido
        const { error: matchUpdateError } = await supabase
          .from("matches")
          .update({
            is_confirmed_player2: true
          })
          .eq("id", selectedInvitation.match.id);

        if (matchUpdateError) throw matchUpdateError;
      }

      const { error } = await supabase
        .from("match_invitations")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", selectedInvitation.id);

      if (error) throw error;

      // Trigger match_invitation_responded webhook
      if (accept) {
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
            .eq("id", selectedInvitation.match.id)
            .single();

          // Get user profile
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user?.id)
            .single();

          if (matchDetails && userProfile) {
            const webhookData = {
              match_id: selectedInvitation.match.id,
              invitation_id: selectedInvitation.id,
              recipient_id: user?.id,
              recipient_name: userProfile.full_name,
              recipient_phone: userProfile.phone,
              remotejid: userProfile.phone,
              response: "accepted",
              is_doubles: matchDetails.is_doubles,
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

            // Get active webhooks for match_invitation_responded
            const { data: webhooks } = await supabase
              .from("webhooks")
              .select("*")
              .eq("event_type", "match_invitation_responded")
              .eq("is_active", true);

            if (webhooks && webhooks.length > 0) {
              console.log(`🚀 Disparando ${webhooks.length} webhooks para match_invitation_responded`);
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
                      event: "match_invitation_responded",
                      timestamp: new Date().toISOString(),
                      data: webhookData,
                      webhook_name: webhook.name
                    }),
                  });

                  console.log(`✅ Webhook ${webhook.name} disparado exitosamente para match_invitation_responded`);
                } catch (webhookError) {
                  console.error(`❌ Error disparando webhook ${webhook.name}:`, webhookError);
                }
              }
            }
          }
        } catch (webhookError) {
          console.error("❌ Error procesando webhooks de respuesta de invitación:", webhookError);
        }
      }

      toast({
        title: accept ? "Invitación aceptada" : "Invitación rechazada",
        description: accept
          ? "Has sido agregado al partido exitosamente"
          : "Has rechazado la invitación al partido",
      });

      setShowConfirmDialog(false);
      setIsPopoverOpen(false);
    } catch (error) {
      console.error("Error updating invitation:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar la invitación",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-6 w-6" style={{ transform: 'scale(1.2)' }} />
            {pendingInvitations.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                {pendingInvitations.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Invitaciones pendientes</h4>
              <p className="text-sm text-muted-foreground">
                Tienes {pendingInvitations.length} invitaciones pendientes
              </p>
            </div>
            <InvitationList
              invitations={pendingInvitations}
              onAccept={(invitation) => {
                setSelectedInvitation(invitation);
                setShowConfirmDialog(true);
              }}
              onReject={(invitation) => {
                setSelectedInvitation(invitation);
                handleInvitationResponse(false);
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={() => handleInvitationResponse(true)}
      />
    </>
  );
};