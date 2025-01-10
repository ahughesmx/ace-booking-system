import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { BookingForm } from "@/components/BookingForm";
import { BookingsList } from "@/components/BookingsList";
import { useBookings } from "@/hooks/use-bookings";
import { startOfToday, endOfTomorrow } from "date-fns";

export function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: bookings = [], refetch: refetchBookings } = useBookings(selectedDate);

  const today = startOfToday();
  const tomorrow = endOfTomorrow();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:sticky md:top-4 h-fit border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5">
        <CardHeader className="bg-gradient-to-r from-[#6898FE]/10 to-transparent">
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
            Reserva tu Cancha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-[#6898FE]/20 p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < today || date > tomorrow}
              className="mx-auto"
              initialFocus
            />
          </div>
          
          {user ? (
            <BookingForm 
              selectedDate={selectedDate}
              onBookingSuccess={() => {
                refetchBookings();
                toast({
                  title: "Reserva exitosa",
                  description: "Tu cancha ha sido reservada correctamente.",
                });
              }}
            />
          ) : (
            <div className="text-center p-4 bg-[#6898FE]/5 rounded-lg border border-[#6898FE]/20">
              <p className="text-sm text-muted-foreground mb-2">
                Inicia sesión para reservar una cancha
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/login')}
                className="hover:bg-[#6898FE]/10 border-[#6898FE]/20"
              >
                Iniciar Sesión
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <BookingsList 
        bookings={bookings}
        selectedDate={selectedDate}
        onCancelSuccess={() => {
          refetchBookings();
          toast({
            title: "Reserva cancelada",
            description: "La reserva ha sido cancelada correctamente.",
          });
        }}
      />
    </div>
  );
}