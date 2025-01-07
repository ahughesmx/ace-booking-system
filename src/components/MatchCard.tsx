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
import { AdminMatchControls } from "./AdminMatchControls";
import { NewMatchInvite } from "./match/NewMatchInvite";
import { MatchTeam } from "./match/MatchTeam";
import { MatchDateTime } from "./match/MatchDateTime";
import { MatchScore } from "./match/MatchScore";
import { MatchLocation } from "./match/MatchLocation";
import { useState } from "react";

type MatchCardProps = {
  match: Match;
  canUpdateResult: boolean;
  isAdmin: boolean;
  userId?: string;
  onUpdateResult: (matchId: string, player1Sets: number, player2Sets: number) => void;
  onDeleteMatch: (matchId: string) => void;
};

export function MatchCard({ 
  match, 
  canUpdateResult, 
  isAdmin,
  userId,
  onUpdateResult,
  onDeleteMatch 
}: MatchCardProps) {
  const [player1Sets, setPlayer1Sets] = useState<string>("");
  const [player2Sets, setPlayer2Sets] = useState<string>("");
  
  const isMatchConfirmed = match.is_confirmed_player1 && match.is_confirmed_player2;
  const isMatchOwner = userId === match.player1_id;
  const showInviteControls = isMatchOwner && !isMatchConfirmed;

  return (
    <Card className="overflow-hidden border-muted bg-card hover:bg-accent/5 transition-colors">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-4">
              <MatchTeam 
                playerName={match.player1?.full_name}
                partnerName={match.is_doubles ? match.player1_partner?.full_name : undefined}
                isDoubles={match.is_doubles}
              />
              <span className="text-muted-foreground">vs</span>
              <MatchTeam 
                playerName={match.player2?.full_name}
                partnerName={match.is_doubles ? match.player2_partner?.full_name : undefined}
                isDoubles={match.is_doubles}
              />
            </div>
          </div>
          <MatchScore 
            player1Sets={match.player1_sets} 
            player2Sets={match.player2_sets} 
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          {match.booking?.start_time && (
            <MatchDateTime dateTime={match.booking.start_time} />
          )}
          <MatchLocation courtName={match.booking?.court?.name} />

          {showInviteControls && (
            <div className="flex flex-wrap gap-2 mt-4">
              {!match.player2_id && (
                <NewMatchInvite
                  matchId={match.id}
                  currentUserId={userId || ''}
                  isDoubles={match.is_doubles || false}
                  position="player2"
                />
              )}
              {match.is_doubles && !match.player1_partner_id && (
                <NewMatchInvite
                  matchId={match.id}
                  currentUserId={userId || ''}
                  isDoubles={true}
                  position="player1_partner"
                />
              )}
              {match.is_doubles && !match.player2_partner_id && match.player2_id && (
                <NewMatchInvite
                  matchId={match.id}
                  currentUserId={userId || ''}
                  isDoubles={true}
                  position="player2_partner"
                />
              )}
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
                    className="w-full mt-4"
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
                          Sets Equipo 1
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
                          Sets Equipo 2
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
                      className="w-full"
                    >
                      Guardar Resultado
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}