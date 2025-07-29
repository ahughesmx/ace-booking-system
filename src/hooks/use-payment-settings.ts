import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";

interface PaymentSettings {
  id: string;
  payment_timeout_minutes: number;
  created_at: string;
  updated_at: string;
}

interface PaymentGateway {
  id: string;
  name: string;
  enabled: boolean;
  test_mode: boolean;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function usePaymentSettings() {
  return useQuery({
    queryKey: ["paymentSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("*")
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as PaymentSettings;
    },
  });
}

export function usePaymentGateways() {
  return useQuery({
    queryKey: ["paymentGateways"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_gateways")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as PaymentGateway[];
    },
  });
}

export function useEnabledPaymentGateways() {
  return useQuery({
    queryKey: ["enabledPaymentGateways"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_gateways")
        .select("*")
        .eq("enabled", true)
        .order("name");
      
      if (error) throw error;
      return data as PaymentGateway[];
    },
  });
}

export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<PaymentSettings>) => {
      const { data, error } = await supabase
        .from("payment_settings")
        .update(settings)
        .eq("id", settings.id!)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentSettings"] });
      toast({
        title: "Configuración actualizada",
        description: "La configuración de pagos se ha actualizado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración de pagos.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePaymentGateway() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<PaymentGateway> 
    }) => {
      const { data, error } = await supabase
        .from("payment_gateways")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentGateways"] });
      queryClient.invalidateQueries({ queryKey: ["enabledPaymentGateways"] });
      toast({
        title: "Pasarela actualizada",
        description: "La configuración de la pasarela se ha actualizado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración de la pasarela.",
        variant: "destructive",
      });
    },
  });
}