import { useBookingRules } from "./use-booking-rules";

export function useCancellationRules(courtType?: string) {
  const { data: tennisRules } = useBookingRules('tennis');
  const { data: padelRules } = useBookingRules('padel');
  
  const getCancellationAllowed = (bookingCourtType?: string) => {
    if (!bookingCourtType) return false;
    
    if (bookingCourtType === 'tennis') {
      return tennisRules?.allow_cancellation ?? true;
    }
    
    if (bookingCourtType === 'padel') {
      return padelRules?.allow_cancellation ?? true;
    }
    
    return false;
  };

  return {
    isCancellationAllowed: courtType ? getCancellationAllowed(courtType) : true,
    getCancellationAllowed,
    tennisRules,
    padelRules,
  };
}