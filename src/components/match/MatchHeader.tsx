
import { Plus, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/components/AuthProvider";

type MatchHeaderProps = {
  matchCount: number;
  isLoading: boolean;
  onCreateMatch: (isDoubles: boolean, bookingId: string) => void;
};

export function MatchHeader({ matchCount, isLoading, onCreateMatch }: MatchHeaderProps) {
  const [selectedBooking, setSelectedBooking] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const { data: bookings = [] } = useQuery({
    queryKey: ["active-bookings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Primero obtenemos las reservas que ya tienen partidos
      const { data: matchesData } = await supabase
        .from("matches")
        .select("booking_id");

      const bookingsWithMatches = new Set(matchesData?.map(match => match.booking_id) || []);

      // Luego obtenemos las reservas del usuario que no tienen partidos
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          court:courts(name, court_type)
        `)
        .eq('user_id', user.id)
        .gte("end_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (bookingsError) throw bookingsError;

      // Filtramos las reservas que ya tienen partidos
      return (bookingsData || []).filter(booking => !bookingsWithMatches.has(booking.id));
    },
    enabled: !!user?.id,
  });

  const handleCreateMatch = (isDoubles: boolean) => {
    if (selectedBooking) {
      onCreateMatch(isDoubles, selectedBooking);
      setIsDialogOpen(false);
      setSelectedBooking("");
    }
  };

  // Función para formatear el tipo de cancha
  const formatCourtType = (courtType: string) => {
    switch (courtType) {
      case 'padel':
        return 'Pádel';
      case 'tennis':
        return 'Tenis';
      default:
        return courtType;
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center bg-gradient-to-r from-[#6898FE]/10 to-transparent p-6 rounded-lg border border-[#6898FE]/20">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
            Partidos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {matchCount} {matchCount === 1 ? "partido registrado" : "partidos registrados"}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={isLoading || bookings.length === 0}
              className="bg-[#6898FE] hover:bg-[#0FA0CE] transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className="h-5 w-5 mr-2" />
              {!user ? "Inicia sesión para crear partidos" : 
                bookings.length === 0 ? "Reserva una cancha primero" : "Crear Partido"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-bold">
                Crear Nuevo Partido
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Selecciona una reserva
                </label>
                <Select
                  value={selectedBooking}
                  onValueChange={setSelectedBooking}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una reserva" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(booking.start_time), "dd/MM/yyyy HH:mm")} - {booking.court?.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Cancha de {formatCourtType(booking.court?.court_type || '')}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleCreateMatch(false)}
                  disabled={!selectedBooking}
                  variant="outline"
                  className="w-full hover:bg-[#6898FE]/10 border-[#6898FE]/20"
                >
                  <User className="h-4 w-4 mr-2" />
                  Singles
                </Button>
                <Button
                  onClick={() => handleCreateMatch(true)}
                  disabled={!selectedBooking}
                  variant="outline"
                  className="w-full hover:bg-[#6898FE]/10 border-[#6898FE]/20"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Dobles
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
