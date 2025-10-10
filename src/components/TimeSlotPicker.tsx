import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimeSlotPickerProps = {
  availableTimeSlots: string[];
  selectedTime: string | null;
  selectedCourt: string;
  isTimeSlotAvailable: (time: string, courtId: string) => boolean;
  onTimeSelect: (time: string) => void;
};

export function TimeSlotPicker({
  availableTimeSlots,
  selectedTime,
  selectedCourt,
  isTimeSlotAvailable,
  onTimeSelect,
}: TimeSlotPickerProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-2">
      {availableTimeSlots.map((time) => {
        const isAvailable = isTimeSlotAvailable(time, selectedCourt);
        return (
          <Button
            key={time}
            size="sm"
            variant={selectedTime === time && isAvailable ? "default" : "outline"}
            className={cn(
              "w-full",
              !isAvailable && "opacity-50 cursor-not-allowed"
            )}
            disabled={!isAvailable}
            onClick={() => onTimeSelect(time)}
          >
            {time}
          </Button>
        );
      })}
    </div>
  );
}