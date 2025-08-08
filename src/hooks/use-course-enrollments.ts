import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "./use-toast";
import { useAuth } from "@/components/AuthProvider";
import type { Database } from "@/integrations/supabase/types";

type CourseEnrollment = Database['public']['Tables']['course_enrollments']['Row'];
type CourseEnrollmentInsert = Database['public']['Tables']['course_enrollments']['Insert'];

export function useUserEnrollments() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["userEnrollments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("course_enrollments")
        .select(`
          *,
          course:courses(
            *,
            instructor:instructors(*)
          )
        `)
        .eq("user_id", user.id)
        .order("enrollment_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useCourseEnrollments(courseId: string) {
  return useQuery({
    queryKey: ["courseEnrollments", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*")
        .eq("course_id", courseId)
        .eq("status", "active")
        .order("enrollment_date");

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}

export function useEnrollInCourse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user?.id) throw new Error("Usuario no autenticado");

      // Check if user is already enrolled
      const { data: existingEnrollment } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .eq("status", "active")
        .maybeSingle();

      if (existingEnrollment) {
        throw new Error("Ya estás inscrito en este curso");
      }

      // Check course capacity
      const { data: course } = await supabase
        .from("courses")
        .select("max_participants")
        .eq("id", courseId)
        .single();

      if (!course) throw new Error("Curso no encontrado");

      const { count: currentEnrollments } = await supabase
        .from("course_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("status", "active");

      if (currentEnrollments && currentEnrollments >= course.max_participants) {
        throw new Error("El curso está lleno");
      }

      // Create enrollment
      const { data, error } = await supabase
        .from("course_enrollments")
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: "active",
          payment_status: "pending"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userEnrollments"] });
      queryClient.invalidateQueries({ queryKey: ["courseEnrollments"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({
        title: "Inscripción exitosa",
        description: "Te has inscrito al curso exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCancelEnrollment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .update({
          status: "cancelled",
          cancellation_date: new Date().toISOString()
        })
        .eq("id", enrollmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userEnrollments"] });
      queryClient.invalidateQueries({ queryKey: ["courseEnrollments"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({
        title: "Inscripción cancelada",
        description: "Tu inscripción ha sido cancelada exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo cancelar la inscripción",
        variant: "destructive",
      });
    },
  });
}