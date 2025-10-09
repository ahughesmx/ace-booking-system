import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "./use-toast";
import type { Database } from "@/integrations/supabase/types";

type Instructor = Database['public']['Tables']['instructors']['Row'];
type InstructorInsert = Database['public']['Tables']['instructors']['Insert'];
type InstructorUpdate = Database['public']['Tables']['instructors']['Update'];

export function useInstructors() {
  return useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
      // Use public view to ensure PII (email, phone) is never exposed
      const { data, error } = await supabase
        .from("instructor_public_info")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });
}

export function useInstructor(id: string) {
  return useQuery({
    queryKey: ["instructor", id],
    queryFn: async () => {
      // Use public view to ensure PII (email, phone) is never exposed
      const { data, error } = await supabase
        .from("instructor_public_info")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// Admin-only hook to fetch full instructor details including PII
export function useInstructorWithPII(id: string) {
  return useQuery({
    queryKey: ["instructor-pii", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instructors")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateInstructor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (instructor: InstructorInsert) => {
      const { data, error } = await supabase
        .from("instructors")
        .insert(instructor)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
      toast({
        title: "Instructor creado",
        description: "El instructor ha sido creado exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el instructor",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateInstructor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InstructorUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("instructors")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
      queryClient.invalidateQueries({ queryKey: ["instructor", data.id] });
      toast({
        title: "Instructor actualizado",
        description: "El instructor ha sido actualizado exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el instructor",
        variant: "destructive",
      });
    },
  });
}