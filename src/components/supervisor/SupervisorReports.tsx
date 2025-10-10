import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupervisorReportsFilters } from "@/components/operator/SupervisorReportsFilters";
import { CashReportsOperator } from "@/components/operator/CashReportsOperator";
import { DailyReportsOperator } from "@/components/operator/DailyReportsOperator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SupervisorReports() {
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reportes de Operadores</CardTitle>
          <CardDescription>
            Revisa los reportes de caja y reportes diarios de los operadores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupervisorReportsFilters 
            onOperatorChange={setSelectedOperatorId}
            selectedOperatorId={selectedOperatorId}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="cash" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cash">Reportes de Caja</TabsTrigger>
          <TabsTrigger value="daily">Reportes Diarios</TabsTrigger>
        </TabsList>

        <TabsContent value="cash">
          <CashReportsOperator operatorId={selectedOperatorId} />
        </TabsContent>

        <TabsContent value="daily">
          <DailyReportsOperator operatorId={selectedOperatorId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
