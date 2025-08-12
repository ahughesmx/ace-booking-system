
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, Calendar, Trophy, GraduationCap, Star } from "lucide-react";
import type { Booking } from "@/types/booking";
import { useCancellationRules } from "@/hooks/use-cancellation-rules";

interface BookingCardProps {
  booking: Booking & { isSpecial?: boolean; event_type?: string; title?: string; description?: string };
  isOwner: boolean;
  onCancel: (id: string) => void;
}

export function BookingCard({ booking, isOwner, onCancel }: BookingCardProps) {
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const { getCancellationAllowed } = useCancellationRules();

  const isCancellationAllowed = getCancellationAllowed(booking.court?.court_type);

  const getEventIcon = (eventType?: string) => {
    switch (eventType) {
      case 'torneo':
        return <Trophy className="w-4 h-4" />;
      case 'clases':
        return <GraduationCap className="w-4 h-4" />;
      case 'eventos':
        return <Star className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getEventColor = (eventType?: string) => {
    switch (eventType) {
      case 'torneo':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'clases':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'eventos':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {booking.isSpecial ? (
                <>
                  {getEventIcon(booking.event_type)}
                  <h3 className="font-semibold text-lg">{booking.title || 'Evento Especial'}</h3>
                  <Badge className={getEventColor(booking.event_type)}>
                    {booking.event_type?.charAt(0).toUpperCase() + booking.event_type?.slice(1) || 'Evento'}
                  </Badge>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-gray-500" />
                  <h3 className="font-semibold text-lg">
                    {booking.user?.full_name || "Reserva Regular"}
                  </h3>
                  <Badge variant="outline">Reserva Regular</Badge>
                </>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>
                  {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{booking.court?.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {booking.court?.court_type === 'tennis' ? 'Tenis' : 'Pádel'}
                </Badge>
              </div>

              {booking.isSpecial && booking.description && (
                <p className="text-sm text-gray-600 mt-2">{booking.description}</p>
              )}

              {!booking.isSpecial && booking.user?.member_id && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <User className="w-3 h-3" />
                  <span>Socio: {booking.user.member_id}</span>
                </div>
              )}
            </div>
          </div>
          
          {isOwner && !booking.isSpecial && isCancellationAllowed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(booking.id)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Cancelar
            </Button>
          )}
          
          {isOwner && !booking.isSpecial && !isCancellationAllowed && (
            <Badge variant="secondary" className="text-xs text-gray-500">
              Cancelación deshabilitada
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
