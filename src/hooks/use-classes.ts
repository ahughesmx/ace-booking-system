import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "./use-toast";
import type { Database } from "@/integrations/supabase/types";

type Class = Database['public']['Tables']['classes']['Row'];
type ClassInsert = Database['public']['Tables']['classes']['Insert'];
type ClassUpdate = Database['public']['Tables']['classes']['Update'];

export function useClasses(courseId?: string) {
  return useQuery({
    queryKey: ["classes", courseId],
    queryFn: async () => {
      let query = supabase
        .from("classes")
        .select(`
          *,
          course:courses(*),
          court:courts(*)
        `)
        .order("class_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useClass(id: string) {
  return useQuery({
    queryKey: ["class", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          *,
          course:courses(
            *,
            instructor:instructors(*)
          ),
          court:courts(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (classData: ClassInsert) => {
      const { data, error } = await supabase
        .from("classes")
        .insert(classData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Clase creada",
        description: "La clase ha sido creada exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la clase",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClassUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("classes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["class", data.id] });
      toast({
        title: "Clase actualizada",
        description: "La clase ha sido actualizada exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la clase",
        variant: "destructive",
      });
    },
  });
}

export function useCancelClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from("classes")
        .update({
          is_cancelled: true,
          cancellation_reason: reason
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({
        title: "Clase cancelada",
        description: "La clase ha sido cancelada exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo cancelar la clase",
        variant: "destructive",
      });
    },
  });
}