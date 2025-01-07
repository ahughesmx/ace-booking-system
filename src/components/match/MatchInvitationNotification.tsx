import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

type MatchInvitation = {
  id: string;
  match_id: string;
  invited_user_id: string;
  status: string;
  created_at: string;
  match: {
    date: string;
    time: string;
    court: {
      name: string;
    };
    created_by: {
      full_name: string;
    };
  };
};

const formatDateTime = (date: string, time: string) => {
  const dateObj = new Date(`${date}T${time}`);
  return format(dateObj, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
};

export const MatchInvitationNotification = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: pendingInvitations = [] } = useQuery<MatchInvitation[]>({
    queryKey: ["pendingInvitations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_invitations")
        .select(
          `
          id,
          match_id,
          invited_user_id,
          status,
          created_at,
          match:matches (
            date,
            time,
            court:courts (name),
            created_by:profiles (full_name)
          )
        `
        )
        .eq("invited_user_id", user?.id)
        .eq("status", "pending");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleInvitationResponse = async (accept: boolean) => {
    if (!selectedInvitation) return;

    try {
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
            <div className="grid gap-2">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="grid gap-1"
                >
                  <div className="text-sm">
                    <span className="font-medium">
                      {invitation.match.created_by.full_name}
                    </span>{" "}
                    te ha invitado a jugar en{" "}
                    <span className="font-medium">
                      {invitation.match.court.name}
                    </span>{" "}
                    el{" "}
                    {formatDateTime(
                      invitation.match.date,
                      invitation.match.time
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedInvitation(invitation);
                        setShowConfirmDialog(true);
                      }}
                    >
                      Aceptar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInvitationResponse(false)}
                    >
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmas tu participación?</AlertDialogTitle>
            <AlertDialogDescription>
              Al aceptar, confirmas tu participación en el partido y te
              comprometes a asistir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleInvitationResponse(true)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};