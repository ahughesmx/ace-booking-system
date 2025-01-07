import { cn } from "@/lib/utils";

interface TimeSlotProps {
  start: string;
  end: string;
  isAvailable: boolean;
  availableCount?: number;
}

export function TimeSlot({ start, end, isAvailable, availableCount = 0 }: TimeSlotProps) {
  return (
    <div
      className={cn(
        "p-2 rounded-lg border transition-colors",
        isAvailable 
          ? "bg-[#6898FE]/10 border-[#6898FE]/20 hover:bg-[#6898FE]/20" 
          : "bg-gray-50 border-gray-200"
      )}
    >
      <p className="font-medium text-sm">
        <span className="md:hidden">{start}</span>
        <span className="hidden md:inline">{start} - {end}</span>
      </p>
      <p className={`text-xs ${isAvailable ? "text-[#6898FE]" : "text-gray-500"}`}>
        {isAvailable 
          ? `${availableCount} ${availableCount === 1 ? 'cancha disponible' : 'canchas disponibles'}`
          : "No disponible"}
      </p>
    </div>
  );
}