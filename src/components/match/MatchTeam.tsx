import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type MatchTeamProps = {
  playerName: string | null | undefined;
  partnerName?: string | null | undefined;
  isDoubles?: boolean;
  isConfirmed?: boolean;
  showConfirmation?: boolean;
};

export function MatchTeam({ 
  playerName, 
  partnerName, 
  isDoubles, 
  isConfirmed,
  showConfirmation = false 
}: MatchTeamProps) {
  const renderTeamName = () => {
    if (!playerName) return "Jugador por confirmar";
    
    const mainPlayerDisplay = (
      <span className="font-semibold">
        {playerName}
        {showConfirmation && (
          <Badge 
            variant={isConfirmed ? "default" : "secondary"}
            className="ml-2 text-xs"
          >
            {isConfirmed ? "ha confirmado" : "por confirmar"}
          </Badge>
        )}
      </span>
    );

    if (!partnerName) return mainPlayerDisplay;
    return (
      <>
        {mainPlayerDisplay} / {partnerName}
      </>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {isDoubles && <Users className="h-4 w-4" />}
      {renderTeamName()}
    </div>
  );
}