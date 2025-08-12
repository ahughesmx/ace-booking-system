
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
        console.log("🚫 No user ID available for bookings query");
        return [];
      }

      console.log("🔍 === DEBUGGING BOOKINGS QUERY ===");
      console.log("👤 User ID:", user.id);
      
      const now = new Date();
      console.log("⏰ Current time:", now.toISOString());

      // Step 1: Get ALL bookings for the user
      console.log("📋 Step 1: Fetching ALL user bookings...");
      const { data: allBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          end_time,
          court:courts(name, court_type)
        `)
        .eq('user_id', user.id)
        .order("start_time", { ascending: true });

      if (bookingsError) {
        console.error("❌ Error fetching bookings:", bookingsError);
        throw bookingsError;
      }

      console.log("📊 Total bookings found:", allBookings?.length || 0);
      console.log("📅 All bookings:", allBookings);

      if (!allBookings || allBookings.length === 0) {
        console.log("⚠️ No bookings found at all for user");
        return [];
      }

      // Step 2: Filter for future bookings only
      console.log("📋 Step 2: Filtering for future bookings...");
      const futureBookings = allBookings.filter(booking => {
        const endTime = new Date(booking.end_time);
        const isFuture = endTime > now;
        console.log(`📅 Booking ${booking.id}:`, {
          endTime: endTime.toISOString(),
          currentTime: now.toISOString(),
          isFuture,
          courtName: booking.court?.name
        });
        return isFuture;
      });

      console.log("✅ Future bookings count:", futureBookings.length);

      // Step 3: Get ALL matches to see which bookings have matches
      console.log("📋 Step 3: Fetching ALL matches...");
      const { data: allMatches, error: matchesError } = await supabase
        .from("matches")
        .select("booking_id");

      if (matchesError) {
        console.error("❌ Error fetching matches:", matchesError);
        throw matchesError;
      }

      console.log("🏆 Total matches found:", allMatches?.length || 0);
      console.log("🏆 All matches:", allMatches);

      const bookingsWithMatches = new Set(allMatches?.map(match => match.booking_id) || []);
      console.log("🚫 Booking IDs that have matches:", Array.from(bookingsWithMatches));

      // Step 4: Filter out bookings that already have matches
      console.log("📋 Step 4: Filtering out bookings with existing matches...");
      const availableBookings = futureBookings.filter(booking => {
        const hasMatch = bookingsWithMatches.has(booking.id);
        console.log(`🔍 Checking booking ${booking.id}:`, {
          courtName: booking.court?.name,
          startTime: booking.start_time,
          hasMatch,
          available: !hasMatch
        });
        return !hasMatch;
      });

      console.log("✅ Final available bookings:", availableBookings.length);
      console.log("📋 Available bookings details:", availableBookings);
      console.log("🔚 === END DEBUGGING ===");
      
      return availableBookings;
    },
    enabled: !!user?.id,
  });

  const selectedBookingData = bookings?.find(booking => booking.id === selectedBooking);
  const isSelectedCourtPadel = selectedBookingData?.court?.court_type === 'padel';

  const handleCreateMatch = (isDoubles: boolean) => {
    if (selectedBooking) {
      console.log("🎾 Creating match for booking:", selectedBooking);
      onCreateMatch(isDoubles, selectedBooking);
      setIsDialogOpen(false);
      setSelectedBooking("");
    }
  };

  const handleCreatePadelMatch = () => {
    handleCreateMatch(true); // Pádel siempre es dobles
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

  console.log("🖥️ MatchHeader render state:", {
    userExists: !!user,
    userId: user?.id,
    bookingsCount: bookings.length,
    isLoadingBookings,
    buttonDisabled: isLoading || isLoadingBookings || bookings.length === 0,
    bookingsData: bookings
  });

  const getButtonText = () => {
    if (!user) return "Inicia sesión para crear partidos";
    if (isLoadingBookings) return "Cargando reservas...";
    if (bookings.length === 0) return "Sin reservas disponibles";
    return "Crear Partido";
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
              disabled={isLoading || isLoadingBookings || bookings.length === 0}
              className="bg-[#6898FE] hover:bg-[#0FA0CE] transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className="h-5 w-5 mr-2" />
              {getButtonText()}
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

              {isSelectedCourtPadel ? (
                <Button
                  onClick={handleCreatePadelMatch}
                  disabled={!selectedBooking}
                  variant="outline"
                  className="w-full hover:bg-[#6898FE]/10 border-[#6898FE]/20"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Crear Partido de Pádel
                </Button>
              ) : (
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
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
