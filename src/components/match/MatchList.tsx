import { List } from "lucide-react";
import type { Match } from "@/types/match";
import { MatchCard } from "@/components/MatchCard";

type MatchListProps = {
  matches: Match[] | undefined;
  isAdmin: boolean;
  userId?: string;
  onUpdateResult: (matchId: string, player1Sets: number, player2Sets: number) => void;
  onDeleteMatch: (matchId: string) => void;
};

export function MatchList({ 
  matches, 
  isAdmin, 
  userId,
  onUpdateResult,
  onDeleteMatch 
}: MatchListProps) {
  if (!matches?.length) {
    return (
      <div className="text-center py-12 bg-muted/50 rounded-lg">
        <List className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No hay partidos</h3>
        <p className="text-muted-foreground mt-1">
          Crea un partido para empezar a jugar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          isAdmin={isAdmin}
          userId={userId}
          canUpdateResult={
            isAdmin || 
            userId === match.player1_id || 
            userId === match.player2_id ||
            userId === match.player1_partner_id ||
            userId === match.player2_partner_id
          }
          onUpdateResult={onUpdateResult}
          onDeleteMatch={onDeleteMatch}
        />
      ))}
    </div>
  );
}