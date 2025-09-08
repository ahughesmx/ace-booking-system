import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

type ReschedulingRules = {
  id: string;
  court_type: string;
  allow_rescheduling: boolean;
  min_rescheduling_time: string;
};

export function useReschedulingRules(courtType?: 'tennis' | 'padel') {
  const { data: rules } = useQuery({
    queryKey: ["rescheduling-rules", courtType],
    queryFn: async () => {
      let query = supabase
        .from("booking_rules")
        .select("id, court_type, allow_rescheduling, min_rescheduling_time");

      if (courtType) {
        query = query.eq("court_type", courtType);
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        return data as ReschedulingRules | null;
      }

      const { data, error } = await query.order("court_type");
      if (error) throw error;
      return data as ReschedulingRules[];
    },
  });

  const getReschedulingAllowed = (courtType: string) => {
    if (!rules) return false;
    
    if (Array.isArray(rules)) {
      const rule = rules.find(r => r.court_type === courtType);
      return rule?.allow_rescheduling ?? false;
    }
    
    return rules.allow_rescheduling ?? false;
  };

  const canReschedule = (bookingTime: string, courtType: string) => {
    if (!rules || !getReschedulingAllowed(courtType)) return false;

    const rule = Array.isArray(rules) 
      ? rules.find(r => r.court_type === courtType)
      : rules;

    if (!rule) return false;

    const bookingDate = new Date(bookingTime);
    const now = new Date();
    
    // Parse interval string (format: "HH:MM:SS")
    const [hours, minutes] = rule.min_rescheduling_time.split(':').map(Number);
    const minHours = hours + (minutes / 60);
    
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilBooking >= minHours;
  };

  return {
    rules,
    getReschedulingAllowed,
    canReschedule
  };
}