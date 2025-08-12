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
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus } from "lucide-react";
import type { Match } from "@/types/match";
import { AdminMatchControls } from "../AdminMatchControls";
import { NewMatchInvite } from "./NewMatchInvite";
import { MatchDateTime } from "./MatchDateTime";
import { MatchScore } from "./MatchScore";
import { MatchLocation } from "./MatchLocation";
import { useState } from "react";

type DoublesMatchCardProps = {
  match: Match;
  canUpdateResult: boolean;
  isAdmin: boolean;
  userId?: string;
  onUpdateResult: (matchId: string, player1Sets: number, player2Sets: number) => void;
  onDeleteMatch: (matchId: string) => void;
};

export function DoublesMatchCard({ 
  match, 
  canUpdateResult, 
  isAdmin,
  userId,
  onUpdateResult,
  onDeleteMatch 
}: DoublesMatchCardProps) {
  const [player1Sets, setPlayer1Sets] = useState<string>("");
  const [player2Sets, setPlayer2Sets] = useState<string>("");
  
  const isMatchConfirmed = match.is_confirmed_player1 && match.is_confirmed_player2;
  const isMatchOwner = userId === match.player1_id;

  const renderTeam = (
    teamName: string,
    player1Name: string | null | undefined,
    player2Name: string | null | undefined,
    isConfirmed?: boolean
  ) => (
    <div className="bg-white/50 rounded-lg p-3 min-h-[80px] flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-[#6898FE]" />
        <span className="font-semibold text-[#6898FE]">{teamName}</span>
        {isConfirmed !== undefined && (
          <Badge 
            variant={isConfirmed ? "default" : "secondary"}
            className="text-xs bg-gradient-to-r from-[#9b87f5] to-[#7E69AB]"
          >
            {isConfirmed ? "confirmado" : "por confirmar"}
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <div className="font-medium">
          {player1Name || "Jugador por confirmar"}
        </div>
        <div className="text-sm text-muted-foreground">
          {player2Name || "Compañero por confirmar"}
        </div>
      </div>
    </div>
  );

  const renderInviteButtons = () => {
    if (isMatchConfirmed || !userId) return null;

    const buttons = [];
    const isPlayer1 = userId === match.player1_id;
    const isPlayer2 = userId === match.player2_id;

    // Solo el creador del partido (player1) puede invitar al oponente principal
    if (isPlayer1 && !match.player2_id) {
      buttons.push(
        <NewMatchInvite
          key="player2"
          matchId={match.id}
          currentUserId={userId}
          isDoubles={true}
          position="player2"
        />
      );
    }

    // Solo player1 puede invitar a su propio compañero
    if (isPlayer1 && !match.player1_partner_id) {
      buttons.push(
        <NewMatchInvite
          key="player1_partner"
          matchId={match.id}
          currentUserId={userId}
          isDoubles={true}
          position="player1_partner"
        />
      );
    }

    // Solo player2 puede invitar a su propio compañero
    if (isPlayer2 && !match.player2_partner_id) {
      buttons.push(
        <NewMatchInvite
          key="player2_partner"
          matchId={match.id}
          currentUserId={userId}
          isDoubles={true}
          position="player2_partner"
        />
      );
    }

    return buttons.length > 0 ? (
      <div className="flex flex-wrap gap-2 mt-4">
        {buttons}
      </div>
    ) : null;
  };

  return (
    <Card className="overflow-hidden border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5 hover:shadow-lg transition-all duration-300">
      <CardHeader className="p-4 bg-gradient-to-r from-[#6898FE]/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-grow">
            <div className="grid grid-cols-3 gap-4 items-center w-full">
              {/* Equipo 1 */}
              {renderTeam(
                "Equipo 1",
                match.player1?.full_name,
                match.player1_partner?.full_name
              )}
              
              {/* VS + Marcador */}
              <div className="flex flex-col items-center">
                <span className="text-muted-foreground font-semibold text-lg">VS</span>
                <MatchScore 
                  player1Sets={match.player1_sets} 
                  player2Sets={match.player2_sets} 
                />
                {isMatchConfirmed && (
                  <Badge variant="secondary" className="mt-1 bg-[#6898FE] text-white text-xs">
                    Confirmado
                  </Badge>
                )}
              </div>
              
              {/* Equipo 2 */}
              {renderTeam(
                "Equipo 2",
                match.player2?.full_name,
                match.player2_partner?.full_name,
                match.is_confirmed_player2
              )}
            </div>
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

        {renderInviteButtons()}

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