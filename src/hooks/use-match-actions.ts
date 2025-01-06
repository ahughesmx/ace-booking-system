import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";

export function useMatchActions(refetchMatches: () => void) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateMatch = async (userId: string | undefined, isDoubles: boolean = false) => {
    try {
      setIsLoading(true);

      if (!userId) {
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
          user_id: userId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const { error: matchError } = await supabase
        .from("matches")
        .insert({
          booking_id: bookingData.id,
          player1_id: userId,
          is_doubles: isDoubles,
        });

      if (matchError) throw matchError;

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
      const { error } = await supabase
        .from("matches")
        .update({
          player1_sets: player1Sets,
          player2_sets: player2Sets,
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

  return {
    isLoading,
    handleCreateMatch,
    handleUpdateResult,
    handleDeleteMatch,
  };
}