import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Match = {
  id: string;
  booking_id: string;
  player1_id: string;
  player2_id: string;
  player1_sets: number;
  player2_sets: number;
  is_doubles: boolean;
  is_confirmed_player1: boolean;
  is_confirmed_player2: boolean;
  booking: {
    start_time: string;
    court: {
      name: string;
    };
  };
  player1: {
    full_name: string;
  };
  player2: {
    full_name: string;
  };
};

export function MatchManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [player1Sets, setPlayer1Sets] = useState<string>("");
  const [player2Sets, setPlayer2Sets] = useState<string>("");

  const { data: matches, refetch: refetchMatches } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          booking:bookings (
            start_time,
            court:courts (
              name
            )
          ),
          player1:profiles!matches_player1_id_fkey (
            full_name
          ),
          player2:profiles!matches_player2_id_fkey (
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Match[];
    },
  });

  const handleCreateMatch = async () => {
    try {
      setIsLoading(true);

      if (!user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para crear un partido",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Create a booking first
      const startTime = new Date();
      startTime.setHours(8, 0, 0, 0); // Set to 8:00 AM
      if (startTime < new Date()) {
        startTime.setDate(startTime.getDate() + 1); // Schedule for next day if current time is past 8 AM
      }
      
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        })
        .select()
        .single();

      if (bookingError) {
        throw bookingError;
      }

      // Create the match
      const { error: matchError } = await supabase.from("matches").insert({
        booking_id: bookingData.id,
        player1_id: user.id,
        is_doubles: false,
      });

      if (matchError) {
        throw matchError;
      }

      toast({
        title: "¡Éxito!",
        description: "Partido creado correctamente",
      });

      refetchMatches();
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el partido. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateResult = async () => {
    if (!selectedMatch) return;

    try {
      const { error } = await supabase
        .from("matches")
        .update({
          player1_sets: parseInt(player1Sets),
          player2_sets: parseInt(player2Sets),
          is_confirmed_player1: user?.id === selectedMatch.player1_id,
          is_confirmed_player2: user?.id === selectedMatch.player2_id,
        })
        .eq("id", selectedMatch.id);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Resultado actualizado correctamente",
      });

      refetchMatches();
      setSelectedMatch(null);
      setPlayer1Sets("");
      setPlayer2Sets("");
    } catch (error) {
      console.error("Error updating match result:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el resultado. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Partidos</h1>
        <Button
          onClick={handleCreateMatch}
          disabled={isLoading}
          className="w-full md:w-auto"
        >
          {isLoading ? "Creando..." : "Crear Partido"}
        </Button>
      </div>

      <div className="grid gap-4">
        {matches?.map((match) => (
          <Card key={match.id}>
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
                {(user?.id === match.player1_id ||
                  user?.id === match.player2_id) && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => setSelectedMatch(match)}
                        variant="outline"
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
                        <Button onClick={handleUpdateResult}>
                          Guardar Resultado
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default MatchManagement;