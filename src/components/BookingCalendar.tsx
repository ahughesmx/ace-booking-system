import { Calendar } from "@/components/ui/calendar";
import { addDays, startOfToday, endOfTomorrow } from "date-fns";

interface BookingCalendarProps {
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export function BookingCalendar({ selectedDate, onSelect }: BookingCalendarProps) {
  const today = startOfToday();
  const tomorrow = endOfTomorrow();

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={onSelect}
      disabled={(date) => date < today || date > tomorrow}
      initialFocus
    />
  );
}