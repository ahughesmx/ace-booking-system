import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { useUserRole } from "@/hooks/use-user-role";
import { MatchHeader } from "./match/MatchHeader";
import { MatchList } from "./match/MatchList";
import type { Match } from "@/types/match";

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
          id,
          booking_id,
          player1_id,
          player2_id,
          player1_sets,
          player2_sets,
          is_doubles,
          is_confirmed_player1,
          is_confirmed_player2,
          created_at,
          player1_partner_id,
          player2_partner_id,
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
          ),
          player1_partner:profiles!matches_player1_partner_id_fkey_profiles (
            full_name
          ),
          player2_partner:profiles!matches_player2_partner_id_fkey_profiles (
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching matches:", error);
        throw error;
      }
      return data as Match[];
    },
  });

  const handleCreateMatch = async (isDoubles: boolean = false) => {
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
        is_doubles: isDoubles,
      });

      if (matchError) {
        throw matchError;
      }

      toast({
        title: "¡Éxito!",
        description: `Partido de ${isDoubles ? 'dobles' : 'singles'} creado correctamente`,
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
          is_confirmed_player1: user?.id === match.player1_id || user?.id === match.player1_partner_id,
          is_confirmed_player2: user?.id === match.player2_id || user?.id === match.player2_partner_id,
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
      <MatchHeader
        matchCount={matches?.length || 0}
        isLoading={isLoading}
        onCreateMatch={handleCreateMatch}
      />
      <MatchList
        matches={matches}
        isAdmin={isAdmin}
        userId={user?.id}
        onUpdateResult={handleUpdateResult}
        onDeleteMatch={handleDeleteMatch}
      />
    </div>
  );
}

export default MatchManagement;