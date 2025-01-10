import { BookingCard } from "@/components/BookingCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Booking } from "@/types/booking";

interface BookingsListContentProps {
  bookings: Booking[];
  isAdmin: boolean;
  userId?: string;
  onCancel: (id: string) => void;
}

export function BookingsListContent({ 
  bookings, 
  isAdmin, 
  userId, 
  onCancel 
}: BookingsListContentProps) {
  // Ordenar las reservas por hora de inicio
  const sortedBookings = [...bookings].sort((a, b) => {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1e3a8a]">Reservas del día</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isOwner={isAdmin || userId === booking.user_id}
              onCancel={onCancel}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}