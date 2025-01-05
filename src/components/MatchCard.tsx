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
import { Calendar, Clock, MapPin } from "lucide-react";

type MatchCardProps = {
  match: Match;
  canUpdateResult: boolean;
  onUpdateResult: (matchId: string, player1Sets: number, player2Sets: number) => void;
};

export function MatchCard({ match, canUpdateResult, onUpdateResult }: MatchCardProps) {
  const [player1Sets, setPlayer1Sets] = useState<string>("");
  const [player2Sets, setPlayer2Sets] = useState<string>("");

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

  return (
    <Card className="overflow-hidden border-muted bg-card hover:bg-accent/5 transition-colors">
      <CardHeader className="p-4">
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base">
              {match.player1?.full_name || "Jugador 1"}
              {match.player2?.full_name && <span className="text-muted-foreground"> vs </span>}
              {match.player2?.full_name || "Esperando rival"}
            </h3>
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

          {canUpdateResult && (
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
                      <label className="text-sm font-medium mb-1.5 block">
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
                    className="w-full"
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