import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "./use-toast";
import { useAuth } from "@/components/AuthProvider";
import type { Database } from "@/integrations/supabase/types";

type ClassAttendance = Database['public']['Tables']['class_attendance']['Row'];
type ClassAttendanceInsert = Database['public']['Tables']['class_attendance']['Insert'];

export function useClassAttendance(classId: string) {
  return useQuery({
    queryKey: ["classAttendance", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_attendance")
        .select(`
          *,
          user:profiles(full_name, avatar_url)
        `)
        .eq("class_id", classId)
        .order("attendance_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
}

export function useUserClassAttendance(userId?: string) {
  return useQuery({
    queryKey: ["userClassAttendance", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("class_attendance")
        .select(`
          *,
          class:classes(
            *,
            course:courses(title, sport_type)
          )
        `)
        .eq("user_id", userId)
        .order("attendance_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      classId, 
      enrollmentId, 
      userId, 
      attended, 
      notes 
    }: {
      classId: string;
      enrollmentId: string;
      userId: string;
      attended: boolean;
      notes?: string;
    }) => {
      // Check if attendance already exists
      const { data: existingAttendance } = await supabase
        .from("class_attendance")
        .select("id")
        .eq("class_id", classId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingAttendance) {
        // Update existing attendance
        const { data, error } = await supabase
          .from("class_attendance")
          .update({
            attended,
            notes,
            attendance_date: new Date().toISOString()
          })
          .eq("id", existingAttendance.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new attendance record
        const { data, error } = await supabase
          .from("class_attendance")
          .insert({
            class_id: classId,
            enrollment_id: enrollmentId,
            user_id: userId,
            attended,
            notes,
            attendance_date: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classAttendance"] });
      queryClient.invalidateQueries({ queryKey: ["userClassAttendance"] });
      toast({
        title: "Asistencia registrada",
        description: "La asistencia ha sido registrada exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo registrar la asistencia",
        variant: "destructive",
      });
    },
  });
}

export function useBulkMarkAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (attendanceRecords: ClassAttendanceInsert[]) => {
      const { data, error } = await supabase
        .from("class_attendance")
        .upsert(attendanceRecords, {
          onConflict: "class_id,user_id"
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classAttendance"] });
      queryClient.invalidateQueries({ queryKey: ["userClassAttendance"] });
      toast({
        title: "Asistencias registradas",
        description: "Las asistencias han sido registradas exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudieron registrar las asistencias",
        variant: "destructive",
      });
    },
  });
}