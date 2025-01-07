import { List } from "lucide-react";
import type { Match } from "@/types/match";
import { MatchCard } from "@/components/MatchCard";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  if (!matches?.length) {
    return (
      <div className="text-center py-12 bg-gradient-to-b from-[#9b87f5]/5 to-transparent rounded-lg border border-[#9b87f5]/10">
        <List className="h-12 w-12 mx-auto text-[#9b87f5]" />
        <h3 className="mt-4 text-lg font-semibold">No hay partidos</h3>
        <p className="text-muted-foreground mt-1 px-4">
          Crea un partido para empezar a jugar
        </p>
      </div>
    );
  }

  // Si hay menos de 3 partidos, usamos un diseño de una sola columna
  const gridCols = matches.length < 3 ? 'max-w-2xl mx-auto' : 'md:grid-cols-2 xl:grid-cols-3';

  return (
    <div className={`grid gap-4 grid-cols-1 ${gridCols}`}>
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