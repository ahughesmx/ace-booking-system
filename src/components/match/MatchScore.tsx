type MatchScoreProps = {
  player1Sets: number | null;
  player2Sets: number | null;
};

export function MatchScore({ player1Sets, player2Sets }: MatchScoreProps) {
  if (player1Sets === null || player2Sets === null) return null;

  return (
    <span className="text-lg font-bold">
      {player1Sets} - {player2Sets}
    </span>
  );
}