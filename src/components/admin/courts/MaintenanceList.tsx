
import { useQuery } from "@tanstack/react-query";
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
import { Calendar, Clock, AlertTriangle, X, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AddMaintenanceDialog } from "./AddMaintenanceDialog";

type MaintenancePeriod = {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  reason: string;
  is_active: boolean;
  created_at: string;
  court: {
    id: string;
    name: string;
    court_type: string;
  };
};

export function MaintenanceList() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
          court:courts(id, name, court_type)
        `)
        .eq("is_active", true)
        .order("start_time");

      if (error) throw error;
      return data as MaintenancePeriod[];
    },
  });

  const handleCancelMaintenance = async (maintenanceId: string, courtName: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("court_maintenance")
        .update({ is_active: false })
        .eq("id", maintenanceId);

      if (error) throw error;

      await refetch();
      toast({
        title: "Mantenimiento cancelado",
        description: `El período de mantenimiento de ${courtName} ha sido cancelado.`,
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

  const getMaintenanceStatus = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (now < start) {
      return { status: "programado", color: "bg-blue-100 text-blue-800", variant: "secondary" as const };
    } else if (now >= start && now <= end) {
      return { status: "activo", color: "bg-red-100 text-red-800", variant: "destructive" as const };
    } else {
      return { status: "finalizado", color: "bg-gray-100 text-gray-800", variant: "outline" as const };
    }
  };

  const formatDateRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const daysDiff = differenceInDays(end, start);
    const isSameDate = isSameDay(start, end);

    if (isSameDate) {
      // Mismo día - mostrar fecha y rango de horas
      return {
        dateText: format(start, "dd MMM yyyy", { locale: es }),
        timeText: `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
        type: "hourly"
      };
    } else if (daysDiff >= 1) {
      // Múltiples días - mostrar rango de fechas
      return {
        dateText: `${format(start, "dd MMM")} - ${format(end, "dd MMM yyyy", { locale: es })}`,
        timeText: `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
        type: "multi-day"
      };
    } else {
      // Cruce de medianoche - mostrar fechas y horas
      return {
        dateText: `${format(start, "dd MMM")} - ${format(end, "dd MMM yyyy", { locale: es })}`,
        timeText: `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
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
          <AddMaintenanceDialog onMaintenanceAdded={refetch} />
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
    <Card className="bg-white shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Períodos de Mantenimiento ({maintenancePeriods.length})
        </CardTitle>
        <AddMaintenanceDialog onMaintenanceAdded={refetch} />
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
                    maintenance.end_time
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
                          <div className="font-medium text-gray-700">
                            {maintenance.court.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getCourtTypeLabel(maintenance.court.court_type)}
                          </div>
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
                        <p className="text-sm text-gray-600 max-w-xs truncate" title={maintenance.reason}>
                          {maintenance.reason}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {isActive && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelMaintenance(maintenance.id, maintenance.court.name)}
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
  );
}
