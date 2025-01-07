import { Users } from "lucide-react";

type MatchTeamProps = {
  playerName: string | null | undefined;
  partnerName?: string | null | undefined;
  isDoubles?: boolean;
};

export function MatchTeam({ playerName, partnerName, isDoubles }: MatchTeamProps) {
  const renderTeamName = () => {
    if (!playerName) return "Jugador por confirmar";
    if (!partnerName) return playerName;
    return `${playerName} / ${partnerName}`;
  };

  return (
    <div className="flex items-center gap-2">
      {isDoubles && <Users className="h-4 w-4" />}
      <span className="font-semibold">{renderTeamName()}</span>
    </div>
  );
}