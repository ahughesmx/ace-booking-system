import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import type { Booking } from "@/types/booking";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useBookingRules } from "@/hooks/use-booking-rules";
import { useIsBookingAffected } from "@/hooks/use-affected-bookings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useGlobalRole } from "@/hooks/use-global-role";
import { useAuth } from "@/components/AuthProvider";
import { isSameDay, startOfDay } from "date-fns";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";

interface RescheduleBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
}

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
];

export function RescheduleBookingModal({ isOpen, onClose, booking }: RescheduleBookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(booking.start_time));
  const [selectedTime, setSelectedTime] = useState<string>(format(new Date(booking.start_time), "HH:mm"));
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if this booking is affected by an emergency closure
  const { data: affectedBooking } = useIsBookingAffected(booking.id);
  const isAffectedByEmergency = !!affectedBooking;
  
  // Check if user is supervisor (without redirect)
  const { user } = useAuth();
  const { data: userRole } = useGlobalRole(user?.id);
  const isSupervisor = userRole?.role === 'supervisor' || userRole?.role === 'admin';
  
  // Get booking rules for the court type
  const { data: bookingRules } = useBookingRules(booking.court?.court_type as 'tennis' | 'padel');

  // Query to check existing bookings for the selected date
  const { data: existingBookings = [] } = useQuery({
    queryKey: ['reschedule-availability', booking.court_id, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      
      const startOfDate = new Date(selectedDate);
      startOfDate.setHours(0, 0, 0, 0);
      
      const endOfDate = new Date(selectedDate);
      endOfDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('court_id', booking.court_id)
        .eq('status', 'paid')
        .neq('id', booking.id) // Exclude current booking
        .gte('start_time', startOfDate.toISOString())
        .lte('start_time', endOfDate.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDate,
  });

  // Function to check if a time slot is available
  const isTimeSlotAvailable = (time: string) => {
    if (!selectedDate) return false;

    const [hours] = time.split(':').map(Number);
    const slotStart = new Date(selectedDate);
    slotStart.setHours(hours, 0, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotEnd.getHours() + 1);

    // Check if slot conflicts with existing bookings
    const hasConflict = existingBookings.some((existingBooking: any) => {
      const existingStart = new Date(existingBooking.start_time);
      const existingEnd = new Date(existingBooking.end_time);
      
      return (
        (slotStart >= existingStart && slotStart < existingEnd) ||
        (slotEnd > existingStart && slotEnd <= existingEnd) ||
        (slotStart <= existingStart && slotEnd >= existingEnd)
      );
    });

    return !hasConflict;
  };

  const getDisabledDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Don't allow dates in the past
    if (date < today) return true;
    
    // If affected by emergency, allow more flexibility
    if (isAffectedByEmergency) {
      // Allow booking up to 30 days ahead for emergency rescheduling
      const maxDate = addDays(today, 30);
      if (date > maxDate) return true;
      return false;
    }
    
    // Apply normal booking rules if available
    if (bookingRules) {
      // Check max_days_ahead
      if (bookingRules.max_days_ahead) {
        const maxDate = addDays(today, bookingRules.max_days_ahead);
        if (date > maxDate) return true;
      }
    }
    
    return false;
  };

  const rescheduleMutation = useMutation({
    mutationFn: async ({ date, time }: { date: Date; time: string }) => {
      const [hours, minutes] = time.split(':').map(Number);
      const newStartTime = new Date(date);
      newStartTime.setHours(hours, minutes, 0, 0);
      
      const newEndTime = new Date(newStartTime);
      newEndTime.setHours(newEndTime.getHours() + 1);

      // Check for conflicts
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id')
        .eq('court_id', booking.court_id)
        .neq('id', booking.id)
        .eq('status', 'paid')
        .or(`and(start_time.lte.${newStartTime.toISOString()},end_time.gt.${newStartTime.toISOString()}),and(start_time.lt.${newEndTime.toISOString()},end_time.gte.${newEndTime.toISOString()})`);

      if (conflicts && conflicts.length > 0) {
        throw new Error('La cancha ya está ocupada en ese horario');
      }

      // Update booking
      const { error } = await supabase
        .from('bookings')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      // If this was an affected booking, mark it as rescheduled
      if (isAffectedByEmergency && affectedBooking) {
        await supabase
          .from('affected_bookings')
          .update({
            rescheduled: true,
            rescheduled_at: new Date().toISOString()
          })
          .eq('booking_id', booking.id);
      }
    },
    onSuccess: () => {
      toast({
        title: "Reserva reagendada",
        description: "La reserva se reagendó exitosamente",
      });
      // Invalidate all booking-related queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['all-bookings-including-pending'] });
      queryClient.invalidateQueries({ queryKey: ['userActiveBookings'] });
      queryClient.invalidateQueries({ queryKey: ['active-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['active-bookings-count'] });
      queryClient.invalidateQueries({ queryKey: ['userUpcomingBookings'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo reagendar la reserva",
        variant: "destructive",
      });
    }
  });

  const handleReschedule = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha y hora",
        variant: "destructive",
      });
      return;
    }

    // Supervisores pueden reagendar sin restricciones si:
    // 1. La reserva está afectada por cierre/mantenimiento
    // 2. Es del mismo día (incluso si ya pasó)
    const bookingDate = new Date(booking.start_time);
    const isToday = isSameDay(startOfDay(new Date()), startOfDay(bookingDate));
    const canBypassRules = isSupervisor && (isAffectedByEmergency || isToday);

    // Si la reserva está afectada por cierre/mantenimiento, permitir reagendar ignorando reglas de tiempo
    // pero respetando horarios de operación y disponibilidad
    const skipTimeRules = isAffectedByEmergency || canBypassRules;

    // Additional validation with booking rules (skip time rules for affected bookings)
    if (bookingRules && !skipTimeRules) {
      const selectedDateTime = new Date(selectedDate);
      selectedDateTime.setHours(parseInt(selectedTime.split(':')[0]), parseInt(selectedTime.split(':')[1]));
      
      // Check minimum advance time
      if (bookingRules.min_advance_booking_time) {
        const [hours, minutes] = bookingRules.min_advance_booking_time.split(':').map(Number);
        const minAdvanceHours = hours + (minutes / 60);
        const minDate = new Date();
        minDate.setHours(minDate.getHours() + minAdvanceHours);
        
        if (selectedDateTime <= minDate) {
          toast({
            title: "Error",
            description: `La reserva debe hacerse con al menos ${bookingRules.min_advance_booking_time} horas de anticipación`,
            variant: "destructive",
          });
          return;
        }
      }
      
      // Check max days ahead
      if (bookingRules.max_days_ahead) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxDate = addDays(today, bookingRules.max_days_ahead);
        
        if (selectedDate > maxDate) {
          toast({
            title: "Error",
            description: `Solo puedes reagendar hasta ${bookingRules.max_days_ahead} días de anticipación`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    rescheduleMutation.mutate({ date: selectedDate, time: selectedTime });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Reagendar Reserva</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          {isAffectedByEmergency && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Reagendado por cierre imprevisto:</strong> Esta reserva fue afectada por un cierre imprevisto o mantenimiento programado. 
                Puedes reagendarla libremente respetando horarios de operación y disponibilidad de canchas.
              </AlertDescription>
            </Alert>
          )}
          
          {isSupervisor && !isAffectedByEmergency && (
            <Alert className="border-blue-500 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Permiso de Supervisor:</strong> Como supervisor, puedes reagendar reservas del mismo día sin restricciones de tiempo.
              </AlertDescription>
            </Alert>
          )}
          
          <div>
            <h4 className="text-sm font-medium mb-2">Reserva actual</h4>
            <div className="text-sm text-gray-600">
              <p>{booking.court?.name} - {booking.court?.court_type === 'tennis' ? 'Tenis' : 'Pádel'}</p>
              <p>{format(new Date(booking.start_time), "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Nueva fecha</h4>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={getDisabledDates}
              className="rounded-md border"
            />
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Nueva hora</h4>
            <TimeSlotPicker
              availableTimeSlots={timeSlots}
              selectedTime={selectedTime}
              selectedCourt={booking.court_id}
              isTimeSlotAvailable={isTimeSlotAvailable}
              onTimeSelect={setSelectedTime}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleReschedule}
            disabled={rescheduleMutation.isPending}
          >
            {rescheduleMutation.isPending ? "Reagendando..." : "Reagendar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}