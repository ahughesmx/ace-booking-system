import { cn } from "@/lib/utils";
import { SpecialBooking } from "@/types/booking";

interface TimeSlotProps {
  start: string;
  end: string;
  isAvailable: boolean;
  availableCount?: number;
  specialEvents?: SpecialBooking[];
}

export function TimeSlot({ start, end, isAvailable, availableCount = 0, specialEvents = [] }: TimeSlotProps) {
  const hasSpecialEvents = specialEvents.length > 0;
  
  return (
    <div
      className={cn(
        "p-2 rounded-lg border transition-colors text-center relative",
        hasSpecialEvents
          ? "bg-purple-50 border-purple-200 hover:bg-purple-100"
          : isAvailable 
            ? "bg-[#6898FE]/10 border-[#6898FE]/20 hover:bg-[#6898FE]/20" 
            : "bg-gray-50 border-gray-200"
      )}
    >
      {hasSpecialEvents && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
          <span className="text-[8px] text-white font-bold">!</span>
        </div>
      )}
      
      <p className="font-medium text-sm">
        <span className="md:hidden">{start}</span>
        <span className="hidden md:inline">{start} - {end}</span>
      </p>
      
      {hasSpecialEvents ? (
        <div className="space-y-1">
          <p className="text-xs text-purple-600 font-medium">
            🎯 {specialEvents[0].event_type}
          </p>
          <p className="text-xs text-purple-500">
            No disponible
          </p>
        </div>
      ) : (
        <p className={`text-xs ${isAvailable ? "text-[#6898FE]" : "text-gray-500"}`}>
          {isAvailable 
            ? `${availableCount} ${availableCount === 1 ? 'cancha disponible' : 'canchas disponibles'}`
            : "No disponible"}
        </p>
      )}
    </div>
  );
}