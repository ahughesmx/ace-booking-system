import { cn } from "@/lib/utils";

interface TimeSlotProps {
  start: string;
  end: string;
  isAvailable: boolean;
}

export function TimeSlot({ start, end, isAvailable }: TimeSlotProps) {
  return (
    <div
      className={cn(
        "p-2 rounded-lg border text-center transition-colors",
        isAvailable 
          ? "bg-green-50 border-green-200 hover:bg-green-100" 
          : "bg-gray-50 border-gray-200"
      )}
    >
      <p className="font-medium text-sm">
        <span className="md:hidden">{start}</span>
        <span className="hidden md:inline">{start} - {end}</span>
      </p>
      <p className={`text-xs ${isAvailable ? "text-green-600" : "text-gray-500"}`}>
        {isAvailable ? "Disponible" : "No disponible"}
      </p>
    </div>
  );
}