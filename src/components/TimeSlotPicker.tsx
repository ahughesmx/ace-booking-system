import { Button } from "@/components/ui/button";

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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {availableTimeSlots.map((time) => (
        <Button
          key={time}
          variant={selectedTime === time ? "default" : "outline"}
          className="w-full"
          disabled={!isTimeSlotAvailable(time, selectedCourt)}
          onClick={() => onTimeSelect(time)}
        >
          {time}
        </Button>
      ))}
    </div>
  );
}