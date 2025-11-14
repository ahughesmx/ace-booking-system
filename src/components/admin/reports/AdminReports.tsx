import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeReport } from "./DateRangeReport";
import { SupervisorReports } from "@/components/supervisor/SupervisorReports";
import { PaymentLogsViewer } from "@/components/admin/PaymentLogsViewer";

export function AdminReports() {
  return (
    <Tabs defaultValue="date-range" className="space-y-6">
      <TabsList>
        <TabsTrigger value="date-range">Rango de Fechas</TabsTrigger>
        <TabsTrigger value="operators">Operadores</TabsTrigger>
        <TabsTrigger value="payment-logs">Logs de Pagos</TabsTrigger>
      </TabsList>

      <TabsContent value="date-range">
        <DateRangeReport />
      </TabsContent>

      <TabsContent value="operators">
        <SupervisorReports />
      </TabsContent>

      <TabsContent value="payment-logs">
        <PaymentLogsViewer />
      </TabsContent>
    </Tabs>
  );
}
