import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy } from "lucide-react";

export default function MatchManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateMatch = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          { 
            user_id: user.id,
            start_time: new Date(),
            end_time: new Date(Date.now() + 3600000) // 1 hour from now
          }
        ])
        .select()
        .single();

      if (bookingError) throw bookingError;

      const { error: matchError } = await supabase
        .from('matches')
        .insert([
          {
            booking_id: booking.id,
            player1_id: user.id,
            is_doubles: false
          }
        ]);

      if (matchError) throw matchError;

      toast({
        title: "Partido creado",
        description: "El partido se ha creado correctamente"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el partido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          Gestión de Partidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleCreateMatch} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Creando..." : "Crear Nuevo Partido"}
        </Button>
      </CardContent>
    </Card>
  );
}