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