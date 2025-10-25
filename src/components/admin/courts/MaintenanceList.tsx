
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, differenceInDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { Calendar, Clock, AlertTriangle, X, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AddMaintenanceDialog } from "./AddMaintenanceDialog";
import { EmergencyClosureDialog } from "./EmergencyClosureDialog";
import { EmergencyClosureButton } from "./EmergencyClosureButton";
import { EditMaintenanceDialog } from "./EditMaintenanceDialog";

type MaintenancePeriod = {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  reason: string;
  is_active: boolean;
  created_at: string;
  is_emergency?: boolean;
  expected_reopening?: string;
  all_courts?: boolean;
  court: {
    id: string;
    name: string;
    court_type: string;
  };
};

export function MaintenanceList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<string | null>(null);

  const { data: maintenancePeriods, refetch } = useQuery({
    queryKey: ["court-maintenance-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("court_maintenance")
        .select(`
          id,
          court_id,
          start_time,
          end_time,
          reason,
          is_active,
          created_at,
          is_emergency,
          expected_reopening,
          all_courts,
          court:courts(id, name, court_type)
        `)
        .order("start_time", { ascending: false }); // Más recientes primero

      if (error) throw error;
      return data as MaintenancePeriod[];
    },
  });


  const handleCancelMaintenance = async (maintenanceId: string, courtName: string, allCourts?: boolean) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("court_maintenance")
        .update({ is_active: false })
        .eq("id", maintenanceId);

      if (error) throw error;

      await refetch();
      
      // Invalidar TODOS los caches de mantenimiento con comodines
      await queryClient.invalidateQueries({ 
        queryKey: ["court-maintenance"],
        refetchType: 'all' // Forzar refetch de queries activas e inactivas
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["active-maintenance"],
        refetchType: 'all'
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["court-maintenance-all"],
        refetchType: 'all'
      });
      
      toast({
        title: "Mantenimiento cancelado",
        description: `El período de mantenimiento de ${allCourts ? 'todas las canchas' : courtName} ha sido cancelado.`,
      });
    } catch (error) {
      console.error("Error canceling maintenance:", error);
      toast({
        title: "Error",
        description: "No se pudo cancelar el período de mantenimiento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMaintenanceStatus = (startTime: string, endTime: string, isActive: boolean) => {
    const mexicoTz = "America/Mexico_City";
    const now = toZonedTime(new Date(), mexicoTz);
    const start = toZonedTime(new Date(startTime), mexicoTz);
    const end = toZonedTime(new Date(endTime), mexicoTz);

    if (!isActive) {
      return { status: "cancelado", color: "bg-gray-100 text-gray-600", variant: "outline" as const };
    }

    if (now < start) {
      return { status: "programado", color: "bg-blue-100 text-blue-800", variant: "secondary" as const };
    } else if (now >= start && now <= end) {
      return { status: "activo", color: "bg-red-100 text-red-800", variant: "destructive" as const };
    } else {
      return { status: "finalizado", color: "bg-gray-100 text-gray-800", variant: "outline" as const };
    }
  };

  const formatDateRange = (startTime: string, endTime: string) => {
    const mexicoTz = "America/Mexico_City";
    const start = toZonedTime(new Date(startTime), mexicoTz);
    const end = toZonedTime(new Date(endTime), mexicoTz);
    const daysDiff = differenceInDays(end, start);
    const isSameDate = isSameDay(start, end);

    console.log('DEBUG Format Date Range:', {
      startTimeUTC: startTime,
      endTimeUTC: endTime,
      startLocal: start.toISOString(),
      endLocal: end.toISOString(),
      formattedStart: formatInTimeZone(new Date(startTime), mexicoTz, "dd MMM yyyy HH:mm"),
      formattedEnd: formatInTimeZone(new Date(endTime), mexicoTz, "dd MMM yyyy HH:mm")
    });

    if (isSameDate) {
      // Mismo día - mostrar fecha y rango de horas
      return {
        dateText: formatInTimeZone(new Date(startTime), mexicoTz, "dd MMM yyyy", { locale: es }),
        timeText: `${formatInTimeZone(new Date(startTime), mexicoTz, "HH:mm")} - ${formatInTimeZone(new Date(endTime), mexicoTz, "HH:mm")}`,
        type: "hourly"
      };
    } else if (daysDiff >= 1) {
      // Múltiples días - mostrar rango de fechas
      return {
        dateText: `${formatInTimeZone(new Date(startTime), mexicoTz, "dd MMM")} - ${formatInTimeZone(new Date(endTime), mexicoTz, "dd MMM yyyy", { locale: es })}`,
        timeText: `${formatInTimeZone(new Date(startTime), mexicoTz, "HH:mm")} - ${formatInTimeZone(new Date(endTime), mexicoTz, "HH:mm")}`,
        type: "multi-day"
      };
    } else {
      // Cruce de medianoche - mostrar fechas y horas
      return {
        dateText: `${formatInTimeZone(new Date(startTime), mexicoTz, "dd MMM")} - ${formatInTimeZone(new Date(endTime), mexicoTz, "dd MMM yyyy", { locale: es })}`,
        timeText: `${formatInTimeZone(new Date(startTime), mexicoTz, "HH:mm")} - ${formatInTimeZone(new Date(endTime), mexicoTz, "HH:mm")}`,
        type: "overnight"
      };
    }
  };

  const getCourtTypeLabel = (courtType: string) => {
    return courtType === 'tennis' ? 'Tenis' : 'Pádel';
  };

  if (!maintenancePeriods?.length) {
    return (
      <Card className="bg-white shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Períodos de Mantenimiento
          </CardTitle>
          <div className="flex gap-2">
            <EmergencyClosureButton />
            <AddMaintenanceDialog onMaintenanceAdded={refetch} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No hay períodos de mantenimiento programados</p>
            <p className="text-sm text-gray-400">
              Usa el botón "Programar Mantenimiento" para añadir nuevos períodos
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Períodos de Mantenimiento ({maintenancePeriods.length})
          </CardTitle>
          <div className="flex gap-2">
            <EmergencyClosureButton />
            <AddMaintenanceDialog onMaintenanceAdded={refetch} />
          </div>
        </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-600">Cancha</TableHead>
                  <TableHead className="font-semibold text-gray-600">Período</TableHead>
                  <TableHead className="font-semibold text-gray-600">Estado</TableHead>
                  <TableHead className="font-semibold text-gray-600">Motivo</TableHead>
                  <TableHead className="font-semibold text-gray-600 text-center">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenancePeriods.map((maintenance) => {
                  const { status, variant } = getMaintenanceStatus(
                    maintenance.start_time,
                    maintenance.end_time,
                    maintenance.is_active
                  );
                  const { dateText, timeText, type } = formatDateRange(
                    maintenance.start_time,
                    maintenance.end_time
                  );
                  const isActive = status === "activo" || status === "programado";

                  return (
                    <TableRow
                      key={maintenance.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-700 flex items-center gap-2">
                            {maintenance.all_courts ? (
                              <>
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                Todas las canchas
                              </>
                            ) : (
                              maintenance.court.name
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {maintenance.all_courts 
                              ? "Cierre general" 
                              : getCourtTypeLabel(maintenance.court.court_type)
                            }
                          </div>
                          {maintenance.is_emergency && (
                            <Badge variant="destructive" className="mt-1 text-xs">
                              Cierre Imprevisto
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{dateText}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{timeText}</span>
                          </div>
                          {type === "multi-day" && (
                            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              Múltiples días
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant} className="capitalize">
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600 max-w-xs" title={maintenance.reason}>
                            {maintenance.reason}
                          </p>
                          {maintenance.is_emergency && maintenance.expected_reopening && (
                            <p className="text-xs text-blue-600">
                              Apertura probable: {formatInTimeZone(new Date(maintenance.expected_reopening), "America/Mexico_City", "dd/MM/yyyy HH:mm", { locale: es })}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {isActive && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingMaintenanceId(maintenance.id)}
                                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelMaintenance(
                                  maintenance.id, 
                                  maintenance.all_courts ? "todas las canchas" : maintenance.court.name,
                                  maintenance.all_courts
                                )}
                                disabled={loading}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
    
    {editingMaintenanceId && (
      <EditMaintenanceDialog
        maintenanceId={editingMaintenanceId}
        open={!!editingMaintenanceId}
        onOpenChange={(open) => !open && setEditingMaintenanceId(null)}
        onMaintenanceUpdated={refetch}
      />
    )}
    </>
  );
}
