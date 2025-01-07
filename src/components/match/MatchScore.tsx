type MatchScoreProps = {
  player1Sets: number | null;
  player2Sets: number | null;
};

export function MatchScore({ player1Sets, player2Sets }: MatchScoreProps) {
  if (player1Sets === null || player2Sets === null) return null;

  return (
    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#9b87f5] to-[#7E69AB]">
      {player1Sets} - {player2Sets}
    </span>
  );
}