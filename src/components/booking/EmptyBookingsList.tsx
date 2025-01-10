import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeSlotsGrid } from "@/components/TimeSlotsGrid";
import { format } from "date-fns";

interface EmptyBookingsListProps {
  isAuthenticated: boolean;
  bookedSlots: Set<string>;
  businessHours: {
    start: number;
    end: number;
  };
  selectedDate?: Date;
}

export function EmptyBookingsList({ 
  isAuthenticated, 
  bookedSlots, 
  businessHours, 
  selectedDate 
}: EmptyBookingsListProps) {
  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1e3a8a]">Horarios disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeSlotsGrid 
            bookedSlots={bookedSlots}
            businessHours={businessHours}
            selectedDate={selectedDate}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1e3a8a]">Reservas del día</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          No hay reservas para este día
        </p>
      </CardContent>
    </Card>
  );
}