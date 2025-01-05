import { TimeSlot } from "./TimeSlot";
import { format, addHours, isBefore } from "date-fns";

interface TimeSlot {
  start: string;
  end: string;
  isPast: boolean;
}

interface TimeSlotsGridProps {
  bookedSlots: Set<string>;
  businessHours: {
    start: number;
    end: number;
  };
}

function generateTimeSlots(businessHours: { start: number; end: number }) {
  const slots: TimeSlot[] = [];
  const now = new Date();
  
  for (let hour = businessHours.start; hour <= businessHours.end; hour++) {
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour);
    const endTime = addHours(startTime, 1);
    const isPast = isBefore(startTime, now);
    
    slots.push({
      start: format(startTime, "HH:00"),
      end: format(endTime, "HH:00"),
      isPast
    });
  }
  return slots;
}

export function TimeSlotsGrid({ bookedSlots, businessHours }: TimeSlotsGridProps) {
  const timeSlots = generateTimeSlots(businessHours);

  return (
    <div className="grid grid-cols-3 gap-3">
      {timeSlots.map(timeSlot => {
        const isAvailable = !bookedSlots.has(timeSlot.start) && !timeSlot.isPast;
        return (
          <TimeSlot
            key={timeSlot.start}
            start={timeSlot.start}
            end={timeSlot.end}
            isAvailable={isAvailable}
          />
        );
      })}
    </div>
  );
}