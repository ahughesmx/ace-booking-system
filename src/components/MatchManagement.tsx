import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { useUserRole } from "@/hooks/use-user-role";
import { MatchCard } from "@/components/MatchCard";
import type { Match } from "@/types/match";
import { Plus, List } from "lucide-react";

export function MatchManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { data: userRole } = useUserRole(user?.id);
  const isAdmin = userRole?.role === 'admin';

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
          player1:profiles!matches_player1_id_fkey_profiles (
            full_name
          ),
          player2:profiles!matches_player2_id_fkey_profiles (
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

      const startTime = new Date();
      startTime.setHours(8, 0, 0, 0);
      if (startTime < new Date()) {
        startTime.setDate(startTime.getDate() + 1);
      }
      
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

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

  const handleUpdateResult = async (
    matchId: string,
    player1Sets: number,
    player2Sets: number
  ) => {
    try {
      const match = matches?.find((m) => m.id === matchId);
      if (!match) return;

      const { error } = await supabase
        .from("matches")
        .update({
          player1_sets: player1Sets,
          player2_sets: player2Sets,
          is_confirmed_player1: user?.id === match.player1_id,
          is_confirmed_player2: user?.id === match.player2_id,
        })
        .eq("id", matchId);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Resultado actualizado correctamente",
      });

      refetchMatches();
    } catch (error) {
      console.error("Error updating match result:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el resultado. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Partido eliminado correctamente",
      });

      refetchMatches();
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el partido. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Partidos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {matches?.length || 0} partidos disponibles
            </p>
          </div>
          <Button
            onClick={handleCreateMatch}
            disabled={isLoading}
            size="icon"
            className="md:hidden bg-[#0A1A2A] hover:bg-[#152538]"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <Button
          onClick={handleCreateMatch}
          disabled={isLoading}
          className="hidden md:flex bg-[#0A1A2A] hover:bg-[#152538]"
        >
          <Plus className="h-5 w-5 mr-2" />
          {isLoading ? "Creando..." : "Crear Partido"}
        </Button>
      </div>

      <div className="space-y-4">
        {matches?.length === 0 ? (
          <div className="text-center py-12 bg-muted/50 rounded-lg">
            <List className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No hay partidos</h3>
            <p className="text-muted-foreground mt-1">
              Crea un partido para empezar a jugar
            </p>
          </div>
        ) : (
          matches?.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              isAdmin={isAdmin}
              canUpdateResult={
                user?.id === match.player1_id || user?.id === match.player2_id
              }
              onUpdateResult={handleUpdateResult}
              onDeleteMatch={handleDeleteMatch}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default MatchManagement;