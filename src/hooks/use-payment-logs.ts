import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export interface LogFilters {
  startDate?: string;
  endDate?: string;
  function?: string;
  status?: string;
  search?: string;
  autoRefresh?: boolean;
}

export interface PaymentLog {
  timestamp: string;
  function: string;
  sessionId: string;
  bookingId: string | null;
  status: "success" | "error" | "not_found" | "unknown";
  duration: number | null;
  errorMessage: string | null;
  metadata: Record<string, any>;
}

export interface LogSummary {
  totalVerifications: number;
  successful: number;
  failed: number;
  notFound: number;
  avgDuration: number;
}

export interface PaymentLogsResponse {
  logs: PaymentLog[];
  summary: LogSummary;
}

export function usePaymentLogs(filters: LogFilters) {
  return useQuery<PaymentLogsResponse>({
    queryKey: ["payment-logs", filters],
    queryFn: async () => {
      console.log("🔄 Fetching payment logs with filters:", filters);
      
      const { data, error } = await supabase.functions.invoke("get-payment-logs", {
        body: { filters }
      });

      if (error) {
        console.error("❌ Error fetching payment logs:", error);
        throw error;
      }

      console.log("✅ Payment logs fetched:", data);
      return data as PaymentLogsResponse;
    },
    refetchInterval: filters.autoRefresh ? 30000 : false,
    retry: 2,
    staleTime: 60000, // 1 minute
  });
}
