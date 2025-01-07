import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export function MatchInvitationNotification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchInvitations = async () => {
      const { data, error } = await supabase
        .from("match_invitations")
        .select(`
          *,
          matches (
            *,
            player1:profiles!matches_player1_id_fkey_profiles (full_name),
            player2:profiles!matches_player2_id_fkey_profiles (full_name),
            player1_partner:profiles!matches_player1_partner_id_fkey_profiles (full_name),
            player2_partner:profiles!matches_player2_partner_id_fkey_profiles (full_name),
            booking:bookings (
              start_time,
              court:courts (name)
            )
          )
        `)
        .eq("recipient_id", user.id)
        .eq("status", "pending");

      if (error) {
        console.error("Error fetching invitations:", error);
        return;
      }

      setInvitations(data || []);
    };

    fetchInvitations();

    const channel = supabase
      .channel("match_invitations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_invitations",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleResponse = async (invitationId: string, accept: boolean) => {
    try {
      if (accept) {
        const invitation = invitations.find((inv) => inv.id === invitationId);
        if (!invitation?.matches?.booking?.start_time) return;

        // Rechazar otras invitaciones para la misma fecha y hora
        const { error: rejectError } = await supabase
          .from("match_invitations")
          .update({ status: "rejected" })
          .eq("recipient_id", user?.id)
          .eq("status", "pending")
          .neq("id", invitationId)
          .filter("matches.booking.start_time", "eq", invitation.matches.booking.start_time);

        if (rejectError) throw rejectError;
      }

      const { error } = await supabase
        .from("match_invitations")
        .update({
          status: accept ? "accepted" : "rejected",
        })
        .eq("id", invitationId);

      if (error) throw error;

      if (accept) {
        // Update the match if invitation is accepted
        const invitation = invitations.find((inv) => inv.id === invitationId);
        if (invitation) {
          await supabase
            .from("matches")
            .update({
              is_confirmed_player2: true,
            })
            .eq("id", invitation.match_id);
        }
      }

      toast({
        title: accept ? "Invitación aceptada" : "Invitación rechazada",
        description: accept
          ? "Has sido agregado al partido"
          : "Has rechazado la invitación al partido",
      });

      setOpen(false);
      setConfirmationOpen(false);
    } catch (error) {
      console.error("Error responding to invitation:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar tu respuesta",
        variant: "destructive",
      });
    }
  };

  const handleAcceptClick = (invitation: any) => {
    setSelectedInvitation(invitation);
    setConfirmationOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
          >
            <Bell className={invitations.length > 0 ? "text-red-500 animate-pulse" : ""} />
            {invitations.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {invitations.length}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitaciones a partidos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {invitations.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No tienes invitaciones pendientes
              </p>
            ) : (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <p className="font-medium">
                    {invitation.matches?.player1?.full_name || 'Usuario'} te ha invitado a un partido
                  </p>
                  {invitation.matches?.booking && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Cancha: {invitation.matches.booking.court?.name || 'No especificada'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Fecha:{" "}
                        {new Date(
                          invitation.matches.booking.start_time
                        ).toLocaleString()}
                      </p>
                    </>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      onClick={() => handleAcceptClick(invitation)}
                    >
                      Aceptar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleResponse(invitation.id, false)}
                    >
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aceptar invitación?</AlertDialogTitle>
            <AlertDialogDescription>
              Al aceptar esta invitación, otras invitaciones que tengas para la misma fecha y hora serán rechazadas automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedInvitation && handleResponse(selectedInvitation.id, true)}>
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}