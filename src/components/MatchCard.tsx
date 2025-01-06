import { useState } from "react";
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
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { AdminMatchControls } from "./AdminMatchControls";
import { MatchInviteDialog } from "./match/MatchInviteDialog";

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  const renderTeamName = (playerName: string | null | undefined, partnerName: string | null | undefined) => {
    if (!playerName) return "Jugador por confirmar";
    if (!partnerName) return playerName;
    return `${playerName} / ${partnerName}`;
  };

  const showInviteControls = isMatchOwner && !isMatchConfirmed;

  return (
    <Card className="overflow-hidden border-muted bg-card hover:bg-accent/5 transition-colors">
      <CardHeader className="p-4">
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className={`h-4 w-4 ${match.is_doubles ? 'opacity-100' : 'opacity-0'}`} />
              <h3 className="font-semibold text-base">
                {renderTeamName(match.player1?.full_name, match.is_doubles ? match.player1_partner?.full_name : undefined)}
                <span className="text-muted-foreground"> vs </span>
                {renderTeamName(match.player2?.full_name, match.is_doubles ? match.player2_partner?.full_name : undefined)}
              </h3>
            </div>
            {match.player1_sets !== null && match.player2_sets !== null && (
              <span className="text-lg font-bold">
                {match.player1_sets} - {match.player2_sets}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          {match.booking?.start_time && (
            <>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{formatDate(match.booking.start_time)}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-2" />
                <span>{formatTime(match.booking.start_time)}</span>
              </div>
            </>
          )}
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{match.booking?.court?.name || "Cancha por asignar"}</span>
          </div>

          {showInviteControls && (
            <div className="flex flex-wrap gap-2 mt-4">
              {!match.player2_id && (
                <MatchInviteDialog
                  matchId={match.id}
                  currentUserId={userId || ''}
                  isDoubles={match.is_doubles || false}
                  position="player2"
                />
              )}
              {match.is_doubles && !match.player1_partner_id && (
                <MatchInviteDialog
                  matchId={match.id}
                  currentUserId={userId || ''}
                  isDoubles={true}
                  position="player1_partner"
                />
              )}
              {match.is_doubles && !match.player2_partner_id && match.player2_id && (
                <MatchInviteDialog
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
                          Sets {renderTeamName(match.player1?.full_name, match.is_doubles ? match.player1_partner?.full_name : undefined)}
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
                          Sets {renderTeamName(match.player2?.full_name, match.is_doubles ? match.player2_partner?.full_name : undefined)}
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