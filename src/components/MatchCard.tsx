import type { Match } from "@/types/match";
import { DoublesMatchCard } from "./match/DoublesMatchCard";
import { SinglesMatchCard } from "./match/SinglesMatchCard";

type MatchCardProps = {
  match: Match;
  canUpdateResult: boolean;
  isAdmin: boolean;
  userId?: string;
  onUpdateResult: (matchId: string, player1Sets: number, player2Sets: number) => void;
  onDeleteMatch: (matchId: string) => void;
};

export function MatchCard(props: MatchCardProps) {
  // Render different components based on match type
  if (props.match.is_doubles) {
    return <DoublesMatchCard {...props} />;
  } else {
    return <SinglesMatchCard {...props} />;
  }
}