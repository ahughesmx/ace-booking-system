
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
      <div className="h-screen w-screen bg-white flex items-center justify-center">
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
      <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col overflow-hidden">
        {/* Header - Fixed height */}
        <div className="bg-white shadow-lg border-b-4 border-blue-500 flex-shrink-0">
          <div className="flex items-center justify-between px-6 py-3">
            <img
              src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
              alt="CDV Logo"
              className="h-12"
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-1">
                {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
              </h1>
              <p className="text-lg text-blue-600 font-semibold flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {format(currentTime, "h:mm a")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={() => setViewMode('all')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
              >
                <Building2 className="w-4 h-4 mr-1" />
                Todas
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewMode('single')}
                className="border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 text-sm"
              >
                <Monitor className="w-4 h-4 mr-1" />
                Individual
              </Button>
            </div>
          </div>
        </div>

        {/* Main Grid - Uses remaining space */}
        <div className="flex-1 p-4 min-h-0">
          <div className="bg-white rounded-lg shadow-xl h-full flex flex-col overflow-hidden">
            {/* Courts Header - Fixed height */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 flex-shrink-0">
              <div className="grid gap-2" style={{ gridTemplateColumns: `100px repeat(${courts?.length || 0}, 1fr)` }}>
                <div className="font-bold text-sm text-center">Hora</div>
                {courts?.map((court) => (
                  <div key={court.id} className="text-center font-bold text-sm truncate">
                    {court.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Time Slots Grid - Fills remaining space exactly */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                {timeSlots.map((slot, index) => {
                  const isCurrent = format(currentTime, "HH:00") === slot;
                  return (
                    <div
                      key={slot}
                      className={`grid gap-2 px-3 border-b border-gray-100 transition-colors flex-1 min-h-0 ${
                        isCurrent ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                      }`}
                      style={{ 
                        gridTemplateColumns: `100px repeat(${courts?.length || 0}, 1fr)`,
                        height: `${100 / timeSlots.length}%`
                      }}
                    >
                      <div className={`text-center font-semibold text-sm flex items-center justify-center ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}>
                        {slot}
                      </div>
                      {courts?.map((court) => {
                        const booked = isBooked(court.id, slot);
                        return (
                          <div
                            key={`${court.id}-${slot}`}
                            className={`rounded transition-all m-1 ${
                              booked
                                ? 'bg-red-500'
                                : 'bg-green-100'
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
        </div>

        {/* Legend - Fixed height */}
        <div className="bg-white border-t p-2 flex-shrink-0">
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span className="text-gray-700 text-sm font-medium">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-700 text-sm font-medium">Reservado</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Single Court View
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col overflow-hidden">
      {/* Header - Fixed height */}
      <div className="bg-white shadow-lg border-b-4 border-blue-500 flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          <img
            src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png"
            alt="CDV Logo"
            className="h-12"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {format(currentTime, "EEEE d 'de' MMMM", { locale: es })}
            </h1>
            <p className="text-lg text-blue-600 font-semibold flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              {format(currentTime, "h:mm a")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode('all')}
              className="border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 text-sm"
            >
              <Building2 className="w-4 h-4 mr-1" />
              Todas
            </Button>
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
            >
              <Monitor className="w-4 h-4 mr-1" />
              Individual
            </Button>
          </div>
        </div>
      </div>

      {/* Court Selector - Fixed height */}
      <div className="bg-white border-b p-3 flex-shrink-0">
        <div className="flex justify-center">
          <select
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
            className="px-4 py-2 border-2 border-blue-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[250px]"
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

      {/* Single Court Content - Uses remaining space */}
      {selectedCourt ? (
        <div className="flex-1 p-4 min-h-0">
          <div className="h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Court Header - Fixed height */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 text-center flex-shrink-0">
              <h2 className="text-2xl font-bold">{selectedCourt.name}</h2>
              <p className="text-base opacity-90">Horarios del Día</p>
            </div>

            {/* Time Slots - Two Column Layout filling remaining space */}
            <div className="flex-1 p-4 min-h-0">
              <div className="grid grid-cols-2 gap-4 h-full">
                {/* Morning Column */}
                <div className="flex flex-col min-h-0">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 text-center border-b-2 border-blue-200 pb-2 flex-shrink-0">
                    Mañana (7:00 - 15:00)
                  </h3>
                  <div className="flex-1 flex flex-col gap-1 min-h-0">
                    {timeSlots.slice(0, 9).map((slot) => {
                      const booked = isBooked(selectedCourt.id, slot);
                      const isCurrent = format(currentTime, "HH:00") === slot;
                      return (
                        <div
                          key={slot}
                          className={`p-2 rounded-lg border-2 transition-all text-center flex-1 min-h-0 flex flex-col justify-center ${
                            booked
                              ? 'bg-red-500 border-red-600 text-white shadow-lg'
                              : isCurrent
                              ? 'bg-blue-100 border-blue-400 text-blue-800 shadow-md'
                              : 'bg-green-100 border-green-300 text-green-800'
                          }`}
                        >
                          <div className="text-base font-bold">{slot}</div>
                          <div className="text-xs font-medium">
                            {booked ? 'RESERVADO' : 'DISPONIBLE'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Afternoon/Evening Column */}
                <div className="flex flex-col min-h-0">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 text-center border-b-2 border-blue-200 pb-2 flex-shrink-0">
                    Tarde/Noche (16:00 - 23:00)
                  </h3>
                  <div className="flex-1 flex flex-col gap-1 min-h-0">
                    {timeSlots.slice(9).map((slot) => {
                      const booked = isBooked(selectedCourt.id, slot);
                      const isCurrent = format(currentTime, "HH:00") === slot;
                      return (
                        <div
                          key={slot}
                          className={`p-2 rounded-lg border-2 transition-all text-center flex-1 min-h-0 flex flex-col justify-center ${
                            booked
                              ? 'bg-red-500 border-red-600 text-white shadow-lg'
                              : isCurrent
                              ? 'bg-blue-100 border-blue-400 text-blue-800 shadow-md'
                              : 'bg-green-100 border-green-300 text-green-800'
                          }`}
                        >
                          <div className="text-base font-bold">{slot}</div>
                          <div className="text-xs font-medium">
                            {booked ? 'RESERVADO' : 'DISPONIBLE'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend - Fixed height */}
            <div className="bg-gray-50 p-3 border-t flex-shrink-0">
              <div className="flex justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                  <span className="text-gray-700 font-medium text-sm">Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 border-2 border-red-600 rounded"></div>
                  <span className="text-gray-700 font-medium text-sm">Reservado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
                  <span className="text-gray-700 font-medium text-sm">Hora Actual</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">Selecciona una cancha para ver sus horarios</p>
          </div>
        </div>
      )}
    </div>
  );
}
