
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

  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ["active-bookings", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log("❌ No user ID available");
        return [];
      }

      console.log("🔍 === SIMPLIFIED BOOKING QUERY ===");
      console.log("👤 User ID:", user.id);
      
      const nowUTC = new Date();
      console.log("⏰ Current time UTC:", nowUTC.toISOString());

      // Obtener todas las reservas del usuario que aún no han terminado
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          end_time,
          court:courts(name, court_type)
        `)
        .eq('user_id', user.id)
        .gt('end_time', nowUTC.toISOString())
        .order("start_time", { ascending: true });

      if (bookingsError) {
        console.error("❌ Error fetching bookings:", bookingsError);
        throw bookingsError;
      }

      console.log("📅 Raw bookings from database:", bookingsData);
      console.log("📊 Number of bookings found:", bookingsData?.length || 0);

      if (!bookingsData || bookingsData.length === 0) {
        console.log("⚠️ No active bookings found for user");
        return [];
      }

      // Obtener los IDs de reservas que ya tienen partidos
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("booking_id");

      if (matchesError) {
        console.error("❌ Error fetching matches:", matchesError);
        throw matchesError;
      }

      console.log("🏆 Matches found:", matchesData?.length || 0);
      const bookingsWithMatches = new Set(matchesData?.map(match => match.booking_id) || []);
      console.log("🚫 Booking IDs with matches:", Array.from(bookingsWithMatches));

      // Filtrar reservas que no tienen partidos
      const availableBookings = bookingsData.filter(booking => {
        const hasMatch = bookingsWithMatches.has(booking.id);
        
        console.log(`📋 Booking ${booking.id}:`, {
          courtName: booking.court?.name,
          startTime: booking.start_time,
          endTime: booking.end_time,
          hasMatch,
          available: !hasMatch
        });
        
        return !hasMatch;
      });

      console.log("✅ Available bookings for matches:", availableBookings.length);
      console.log("🔚 === END SIMPLIFIED QUERY ===");
      
      return availableBookings;
    },
    enabled: !!user?.id,
  });

  const handleCreateMatch = (isDoubles: boolean) => {
    if (selectedBooking) {
      console.log("🎾 Creating match for booking:", selectedBooking);
      onCreateMatch(isDoubles, selectedBooking);
      setIsDialogOpen(false);
      setSelectedBooking("");
    }
  };

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

  console.log("🖥️ MatchHeader render:", {
    userExists: !!user,
    bookingsCount: bookings.length,
    isLoadingBookings,
    buttonDisabled: isLoading || isLoadingBookings || bookings.length === 0
  });

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
              disabled={isLoading || isLoadingBookings || bookings.length === 0}
              className="bg-[#6898FE] hover:bg-[#0FA0CE] transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className="h-5 w-5 mr-2" />
              {!user ? "Inicia sesión para crear partidos" : 
                isLoadingBookings ? "Cargando reservas..." :
                bookings.length === 0 ? "No hay reservas disponibles" : "Crear Partido"}
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
