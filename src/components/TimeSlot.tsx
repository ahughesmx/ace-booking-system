import { cn } from "@/lib/utils";
import { SpecialBooking } from "@/types/booking";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EmergencyClosure {
  id: string;
  reason: string;
  expected_reopening?: string;
  is_emergency: boolean;
}

interface TimeSlotProps {
  start: string;
  end: string;
  isAvailable: boolean;
  availableCount?: number;
  specialEvents?: SpecialBooking[];
  bookedUser?: string;
  showCourtCount?: boolean;
  emergencyClosure?: EmergencyClosure;
}

export function TimeSlot({ 
  start, 
  end, 
  isAvailable, 
  availableCount = 0, 
  specialEvents = [], 
  bookedUser, 
  showCourtCount = true,
  emergencyClosure 
}: TimeSlotProps) {
  const hasSpecialEvents = specialEvents.length > 0;
  const hasEmergencyClosure = emergencyClosure && emergencyClosure.is_emergency;
  
  // Si hay cierre imprevisto, el slot no está disponible
  const actuallyAvailable = isAvailable && !hasEmergencyClosure;
  
  const SlotContent = () => (
    <div
      className={cn(
        "p-2 rounded-lg border transition-colors text-center relative",
        hasEmergencyClosure
          ? "bg-red-50 border-red-300 hover:bg-red-100 cursor-help"
          : hasSpecialEvents
          ? "bg-purple-50 border-purple-200 hover:bg-purple-100"
          : actuallyAvailable 
            ? "bg-[#6898FE]/10 border-[#6898FE]/20 hover:bg-[#6898FE]/20" 
            : "bg-gray-50 border-gray-200"
      )}
    >
      {hasEmergencyClosure && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
          <AlertTriangle className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      
      {hasSpecialEvents && !hasEmergencyClosure && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
          <span className="text-[8px] text-white font-bold">!</span>
        </div>
      )}
      
      <p className="font-medium text-sm">
        <span className="md:hidden">{start}</span>
        <span className="hidden md:inline">{start} - {end}</span>
      </p>
      
      {hasEmergencyClosure ? (
        <div className="space-y-1">
          <p className="text-xs text-red-600 font-medium flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Cierre Imprevisto
          </p>
          <p className="text-[10px] text-red-500">
            Cancha cerrada
          </p>
        </div>
      ) : hasSpecialEvents ? (
        <div className="space-y-1">
          <p className="text-xs text-purple-600 font-medium">
            🎯 {specialEvents[0].event_type}
          </p>
          <p className="text-xs text-purple-500">
            No disponible
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className={`text-xs ${actuallyAvailable ? "text-[#6898FE]" : "text-gray-500"}`}>
            {actuallyAvailable 
              ? (showCourtCount 
                  ? `${availableCount} ${availableCount === 1 ? 'cancha disponible' : 'canchas disponibles'}`
                  : "Disponible")
              : "Reservado"}
          </p>
          {!actuallyAvailable && (
            <p className="text-xs text-gray-500">
              No disponible
            </p>
          )}
          {!actuallyAvailable && bookedUser && (
            <p className="text-[10px] text-gray-400 font-medium">
              {bookedUser}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (hasEmergencyClosure) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div>
              <SlotContent />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Cierre Imprevisto</p>
                  <p className="text-xs text-muted-foreground">
                    {emergencyClosure.reason}
                  </p>
                  {emergencyClosure.expected_reopening && (
                    <p className="text-xs text-blue-600 mt-2">
                      <strong>Apertura probable:</strong>{" "}
                      {format(new Date(emergencyClosure.expected_reopening), "dd/MM/yyyy HH:mm", { locale: es })}
                      <span className="block text-[10px] text-gray-500 mt-0.5">
                        (Pendiente de confirmar)
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <SlotContent />;
}
