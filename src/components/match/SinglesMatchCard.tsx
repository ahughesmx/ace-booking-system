import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Match } from "@/types/match";
import { AdminMatchControls } from "../AdminMatchControls";
import { NewMatchInvite } from "./NewMatchInvite";
import { MatchTeam } from "./MatchTeam";
import { MatchDateTime } from "./MatchDateTime";
import { MatchScore } from "./MatchScore";
import { MatchLocation } from "./MatchLocation";
import { useState } from "react";
import { Badge } from "../ui/badge";

type SinglesMatchCardProps = {
  match: Match;
  canUpdateResult: boolean;
  isAdmin: boolean;
  userId?: string;
  onUpdateResult: (matchId: string, player1Sets: number, player2Sets: number) => void;
  onDeleteMatch: (matchId: string) => void;
};

export function SinglesMatchCard({ 
  match, 
  canUpdateResult, 
  isAdmin,
  userId,
  onUpdateResult,
  onDeleteMatch 
}: SinglesMatchCardProps) {
  const [player1Sets, setPlayer1Sets] = useState<string>("");
  const [player2Sets, setPlayer2Sets] = useState<string>("");
  
  const isMatchConfirmed = match.is_confirmed_player1 && match.is_confirmed_player2;
  const isMatchOwner = userId === match.player1_id;

  return (
    <Card className="overflow-hidden border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5 hover:shadow-lg transition-all duration-300">
      <CardHeader className="p-4 bg-gradient-to-r from-[#6898FE]/10 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <MatchTeam 
                playerName={match.player1?.full_name}
                isDoubles={false}
                showConfirmation={false}
              />
              <span className="text-muted-foreground font-semibold text-center">vs</span>
              <MatchTeam 
                playerName={match.player2?.full_name}
                isDoubles={false}
                showConfirmation={true}
                isConfirmed={match.is_confirmed_player2}
              />
            </div>
          </div>
          <div className="flex flex-col items-end sm:items-end">
            <MatchScore 
              player1Sets={match.player1_sets} 
              player2Sets={match.player2_sets} 
            />
            {isMatchConfirmed && (
              <Badge variant="secondary" className="mt-1 bg-[#6898FE] text-white">
                Confirmado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col space-y-2">
          {match.booking?.start_time && (
            <MatchDateTime dateTime={match.booking.start_time} />
          )}
          <MatchLocation courtName={match.booking?.court?.name} />
        </div>

        {isMatchOwner && !isMatchConfirmed && !match.player2_id && userId && (
          <div className="flex flex-wrap gap-2 mt-4">
            <NewMatchInvite
              matchId={match.id}
              currentUserId={userId}
              isDoubles={false}
              position="player2"
            />
          </div>
        )}

        {isAdmin ? (
          <AdminMatchControls
            match={match}
            onUpdateResult={onUpdateResult}
            onDeleteMatch={onDeleteMatch}
          />
        ) : (
          canUpdateResult && !isMatchConfirmed && (
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-[#9b87f5]/20 hover:bg-[#9b87f5]/10"
                >
                  Actualizar Resultado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Actualizar Resultado</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">
                        Sets Jugador 1
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="3"
                        value={player1Sets}
                        onChange={(e) => setPlayer1Sets(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">
                        Sets Jugador 2
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="3"
                        value={player2Sets}
                        onChange={(e) => setPlayer2Sets(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      onUpdateResult(match.id, parseInt(player1Sets), parseInt(player2Sets));
                      setPlayer1Sets("");
                      setPlayer2Sets("");
                    }}
                    className="w-full bg-[#9b87f5] hover:bg-[#7E69AB]"
                  >
                    Guardar Resultado
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )
        )}
      </CardContent>
    </Card>
  );
}