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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {availableTimeSlots.map((time) => {
        const isAvailable = isTimeSlotAvailable(time, selectedCourt);
        return (
          <Button
            key={time}
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