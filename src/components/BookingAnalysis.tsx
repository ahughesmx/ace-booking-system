
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function BookingAnalysis() {
  const { data: bookingsAnalysis, isLoading } = useQuery({
    queryKey: ["bookingsAnalysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          end_time,
          court:courts(id, name, court_type),
          user:profiles(full_name)
        `)
        .gte("start_time", new Date().toISOString())
        .order("start_time");

      if (error) {
        console.error("Error fetching bookings analysis:", error);
        throw error;
      }
      
      console.log("Bookings analysis data:", data);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Reservas</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Cargando información de reservas...</p>
        </CardContent>
      </Card>
    );
  }

  if (!bookingsAnalysis || bookingsAnalysis.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Reservas</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No se encontraron reservas activas en la base de datos.</p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por tipo de cancha
  const groupedByCourtType = bookingsAnalysis.reduce((acc, booking) => {
    const courtType = booking.court?.court_type || 'Sin tipo';
    if (!acc[courtType]) {
      acc[courtType] = [];
    }
    acc[courtType].push(booking);
    return acc;
  }, {} as Record<string, typeof bookingsAnalysis>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1e3a8a]">Análisis de Reservas en Base de Datos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total de reservas activas: {bookingsAnalysis.length}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedByCourtType).map(([courtType, bookings]) => (
              <div key={courtType} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 capitalize">
                  Canchas de {courtType === 'tennis' ? 'Tenis' : courtType === 'padel' ? 'Pádel' : courtType}
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({bookings.length} reserva{bookings.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                
                <div className="space-y-2">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="bg-gray-50 rounded p-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Cancha:</span> {booking.court?.name || 'Sin nombre'}
                        </div>
                        <div>
                          <span className="font-medium">Fecha:</span>{' '}
                          {format(new Date(booking.start_time), "EEEE, dd 'de' MMMM", { locale: es })}
                        </div>
                        <div>
                          <span className="font-medium">Hora:</span>{' '}
                          {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                        </div>
                        <div>
                          <span className="font-medium">Usuario:</span> {booking.user?.full_name || 'Sin nombre'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumen por día */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1e3a8a]">Resumen por Día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(
              bookingsAnalysis.reduce((acc, booking) => {
                const date = format(new Date(booking.start_time), "yyyy-MM-dd");
                const dayName = format(new Date(booking.start_time), "EEEE, dd 'de' MMMM", { locale: es });
                if (!acc[date]) {
                  acc[date] = { dayName, count: 0, courts: new Set() };
                }
                acc[date].count++;
                acc[date].courts.add(booking.court?.name || 'Sin nombre');
                return acc;
              }, {} as Record<string, { dayName: string; count: number; courts: Set<string> }>)
            ).map(([date, info]) => (
              <div key={date} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <span className="font-medium">{info.dayName}</span>
                <span className="text-sm text-muted-foreground">
                  {info.count} reserva{info.count !== 1 ? 's' : ''} en {info.courts.size} cancha{info.courts.size !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
