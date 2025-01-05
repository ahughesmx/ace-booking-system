import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type MatchCardProps = {
  match: Match;
  canUpdateResult: boolean;
  onUpdateResult: (matchId: string, player1Sets: number, player2Sets: number) => void;
};

export function MatchCard({ match, canUpdateResult, onUpdateResult }: MatchCardProps) {
  const [player1Sets, setPlayer1Sets] = useState<string>("");
  const [player2Sets, setPlayer2Sets] = useState<string>("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {match.player1?.full_name || "Jugador 1"} vs{" "}
          {match.player2?.full_name || "Jugador 2"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p>
            Cancha: {match.booking?.court?.name || "Por asignar"}
          </p>
          <p>
            Fecha:{" "}
            {match.booking?.start_time
              ? new Date(match.booking.start_time).toLocaleString()
              : "Por definir"}
          </p>
          {match.player1_sets !== null && match.player2_sets !== null && (
            <p>
              Resultado: {match.player1_sets} - {match.player2_sets}
            </p>
          )}
          {canUpdateResult && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
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
                      <label className="text-sm">
                        Sets {match.player1?.full_name || "Jugador 1"}
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
                      <label className="text-sm">
                        Sets {match.player2?.full_name || "Jugador 2"}
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
                  >
                    Guardar Resultado
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}