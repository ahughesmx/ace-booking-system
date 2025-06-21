
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Monitor, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Generate time slots from 7:00 to 23:00
const timeSlots = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 7;
  return `${hour.toString().padStart(2, "0")}:00`;
});

export default function Display() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');

  const { data: displaySettings } = useQuery({
    queryKey: ["display-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("display_settings")
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Error fetching display settings:", error);
        throw error;
      }

      return data || {
        is_enabled: true,
        rotation_interval: 10000,
      };
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["display-bookings"],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("bookings")
        .select("*, court:courts(*)")
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: courts } = useQuery({
    queryKey: ["courts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    const wakeLock = async () => {
      try {
        await navigator.wakeLock.request("screen");
      } catch (err) {
        console.log(`${err.name}, ${err.message}`);
      }
    };
    wakeLock();

    return () => clearInterval(interval);
  }, []);

  if (!displaySettings?.is_enabled) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <img
          src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
          alt="CDV Logo"
          className="max-w-[200px]"
        />
      </div>
    );
  }

  const isBooked = (courtId: string, timeSlot: string) => {
    return bookings?.some(
      (booking) =>
        booking.court_id === courtId &&
        format(new Date(booking.start_time), "HH:00") === timeSlot
    );
  };

  const selectedCourt = courts?.find(court => court.id === selectedCourtId);

  // Render All Courts View
  if (viewMode === 'all') {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-lg border-b-4 border-blue-500">
          <div className="flex items-center justify-between px-8 py-6">
            <img
              src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
              alt="CDV Logo"
              className="h-16"
            />
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
              </h1>
              <p className="text-2xl text-blue-600 font-semibold flex items-center justify-center gap-2">
                <Clock className="w-6 h-6" />
                {format(currentTime, "h:mm a")}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="default"
                onClick={() => setViewMode('all')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg"
              >
                <Building2 className="w-5 h-5 mr-2" />
                Todas las Canchas
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewMode('single')}
                className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-3 text-lg"
              >
                <Monitor className="w-5 h-5 mr-2" />
                Vista Individual
              </Button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Courts Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: `120px repeat(${courts?.length || 0}, 1fr)` }}>
                <div className="font-bold text-lg text-center">Horario</div>
                {courts?.map((court) => (
                  <div key={court.id} className="text-center font-bold text-lg">
                    {court.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Time Slots Grid */}
            <div className="divide-y divide-gray-200">
              {timeSlots.map((slot, index) => {
                const isCurrent = format(currentTime, "HH:00") === slot;
                return (
                  <div
                    key={slot}
                    className={`grid gap-4 p-4 transition-colors ${
                      isCurrent ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                    } ${index % 2 === 0 ? 'bg-gray-25' : 'bg-white'}`}
                    style={{ gridTemplateColumns: `120px repeat(${courts?.length || 0}, 1fr)` }}
                  >
                    <div className={`text-center font-semibold text-lg ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}>
                      {slot}
                    </div>
                    {courts?.map((court) => {
                      const booked = isBooked(court.id, slot);
                      return (
                        <div
                          key={`${court.id}-${slot}`}
                          className={`h-12 rounded-lg border-2 transition-all ${
                            booked
                              ? 'bg-red-500 border-red-600 shadow-md'
                              : 'bg-green-100 border-green-300 hover:bg-green-200'
                          }`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white border-t p-4">
          <div className="flex justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 border-2 border-green-300 rounded"></div>
              <span className="text-gray-700 font-medium">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 border-2 border-red-600 rounded"></div>
              <span className="text-gray-700 font-medium">Reservado</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Single Court View
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-blue-500">
        <div className="flex items-center justify-between px-8 py-6">
          <img
            src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
            alt="CDV Logo"
            className="h-16"
          />
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
            </h1>
            <p className="text-2xl text-blue-600 font-semibold flex items-center justify-center gap-2">
              <Clock className="w-6 h-6" />
              {format(currentTime, "h:mm a")}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setViewMode('all')}
              className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-3 text-lg"
            >
              <Building2 className="w-5 h-5 mr-2" />
              Todas las Canchas
            </Button>
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg"
            >
              <Monitor className="w-5 h-5 mr-2" />
              Vista Individual
            </Button>
          </div>
        </div>
      </div>

      {/* Court Selector */}
      <div className="bg-white border-b p-4">
        <div className="flex justify-center">
          <select
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
            className="px-6 py-3 border-2 border-blue-300 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[300px]"
          >
            <option value="">Seleccionar Cancha</option>
            {courts?.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Single Court Content */}
      {selectedCourt ? (
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Court Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 text-center">
                <h2 className="text-4xl font-bold mb-2">{selectedCourt.name}</h2>
                <p className="text-xl opacity-90">Horarios del Día</p>
              </div>

              {/* Time Slots - Two Column Layout */}
              <div className="p-8">
                <div className="grid grid-cols-2 gap-6">
                  {/* Morning Column */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center border-b-2 border-blue-200 pb-3">
                      Mañana
                    </h3>
                    <div className="space-y-3">
                      {timeSlots.slice(0, 9).map((slot) => {
                        const booked = isBooked(selectedCourt.id, slot);
                        const isCurrent = format(currentTime, "HH:00") === slot;
                        return (
                          <div
                            key={slot}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${
                              booked
                                ? 'bg-red-500 border-red-600 text-white shadow-lg'
                                : isCurrent
                                ? 'bg-blue-100 border-blue-400 text-blue-800 shadow-md'
                                : 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            <div className="text-xl font-bold">{slot}</div>
                            <div className="text-sm font-medium mt-1">
                              {booked ? 'RESERVADO' : 'DISPONIBLE'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Afternoon/Evening Column */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center border-b-2 border-blue-200 pb-3">
                      Tarde/Noche
                    </h3>
                    <div className="space-y-3">
                      {timeSlots.slice(9).map((slot) => {
                        const booked = isBooked(selectedCourt.id, slot);
                        const isCurrent = format(currentTime, "HH:00") === slot;
                        return (
                          <div
                            key={slot}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${
                              booked
                                ? 'bg-red-500 border-red-600 text-white shadow-lg'
                                : isCurrent
                                ? 'bg-blue-100 border-blue-400 text-blue-800 shadow-md'
                                : 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            <div className="text-xl font-bold">{slot}</div>
                            <div className="text-sm font-medium mt-1">
                              {booked ? 'RESERVADO' : 'DISPONIBLE'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="bg-gray-50 p-6 border-t">
                <div className="flex justify-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 border-2 border-green-300 rounded-lg"></div>
                    <span className="text-gray-700 font-medium text-lg">Disponible</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-red-500 border-2 border-red-600 rounded-lg"></div>
                    <span className="text-gray-700 font-medium text-lg">Reservado</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 border-2 border-blue-400 rounded-lg"></div>
                    <span className="text-gray-700 font-medium text-lg">Hora Actual</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl">Selecciona una cancha para ver sus horarios</p>
          </div>
        </div>
      )}
    </div>
  );
}
