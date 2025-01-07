import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { MatchInvitation } from "@/types/match-invitation";

interface InvitationListProps {
  invitations: MatchInvitation[];
  onAccept: (invitation: MatchInvitation) => void;
  onReject: (invitation: MatchInvitation) => void;
}

export const InvitationList = ({ invitations, onAccept, onReject }: InvitationListProps) => {
  return (
    <div className="grid gap-2">
      {invitations.map((invitation) => (
        <div key={invitation.id} className="grid gap-1">
          <div className="text-sm">
            <span className="font-medium">
              {invitation.match?.player1?.full_name}
            </span>{" "}
            te ha invitado a jugar en{" "}
            <span className="font-medium">
              {invitation.match?.booking?.court?.name}
            </span>{" "}
            el{" "}
            {invitation.match?.booking?.start_time && 
              format(
                new Date(invitation.match.booking.start_time),
                "EEEE d 'de' MMMM 'a las' HH:mm",
                { locale: es }
              )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAccept(invitation)}
            >
              Aceptar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReject(invitation)}
            >
              Rechazar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};