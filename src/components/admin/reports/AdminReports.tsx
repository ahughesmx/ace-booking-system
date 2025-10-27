import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeReport } from "./DateRangeReport";
import { SupervisorReports } from "@/components/supervisor/SupervisorReports";

export function AdminReports() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reporte por Rango de Fechas</CardTitle>
          <CardDescription>
            Consulta y exporta reservaciones pagadas en un período específico con múltiples filtros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangeReport />
        </CardContent>
      </Card>

      <SupervisorReports />
    </div>
  );
}
