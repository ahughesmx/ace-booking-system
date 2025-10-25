import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { EmergencyClosureDialog } from "./EmergencyClosureDialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function EmergencyClosureButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);

  // Verificar si hay cierres de emergencia activos
  const { data: activeEmergencies } = useQuery({
    queryKey: ["active-emergency-closures"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("court_maintenance")
        .select(`
          id,
          court_id,
          reason,
          expected_reopening,
          all_courts,
          court:courts(id, name, court_type)
        `)
        .eq("is_active", true)
        .eq("is_emergency", true)
        .gte("end_time", now);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!activeEmergencies || activeEmergencies.length === 0) return;

      const ids = activeEmergencies.map(e => e.id);
      
      const { error } = await supabase
        .from("court_maintenance")
        .update({ 
          is_active: false,
          end_time: new Date().toISOString()
        })
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: async () => {
      toast({
        title: "Canchas reabiertas",
        description: "Las canchas han sido reabiertas exitosamente. Los usuarios pueden volver a reservar.",
      });
      // Invalidar TODOS los caches de mantenimiento
      await queryClient.invalidateQueries({ 
        queryKey: ["court-maintenance"],
        refetchType: 'all'
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["active-maintenance"],
        refetchType: 'all'
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["court-maintenance-all"],
        refetchType: 'all'
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["active-emergency-closures"],
        refetchType: 'all'
      });
      setShowReopenDialog(false);
    },
    onError: (error) => {
      console.error("Error reopening courts:", error);
      toast({
        title: "Error",
        description: "No se pudieron reabrir las canchas.",
        variant: "destructive",
      });
    },
  });

  const hasActiveEmergencies = activeEmergencies && activeEmergencies.length > 0;

  if (hasActiveEmergencies) {
    return (
      <>
        <Button
          onClick={() => setShowReopenDialog(true)}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          Confirmar Apertura
        </Button>

        <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar reapertura de canchas</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Estás a punto de reabrir las siguientes canchas que estaban cerradas por emergencia:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {activeEmergencies.map((emergency) => (
                    <li key={emergency.id}>
                      {emergency.all_courts 
                        ? "🚨 Todas las canchas" 
                        : `${emergency.court?.name} (${emergency.court?.court_type})`
                      }
                    </li>
                  ))}
                </ul>
                <p className="text-yellow-600 font-medium mt-4">
                  ¿Confirmas que las canchas están listas para ser utilizadas?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => reopenMutation.mutate()}
                disabled={reopenMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {reopenMutation.isPending ? "Reabriendo..." : "Confirmar Apertura"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant="destructive"
        className="flex items-center gap-2"
      >
        <AlertTriangle className="w-4 h-4" />
        Cierre Imprevisto
      </Button>

      <EmergencyClosureDialog 
        open={showDialog} 
        onOpenChange={setShowDialog}
      />
    </>
  );
}