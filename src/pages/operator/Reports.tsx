import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import MainNav from "@/components/MainNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CashReportsOperator } from "@/components/operator/CashReportsOperator";
import { DailyReportsOperator } from "@/components/operator/DailyReportsOperator";
import { SupervisorReportsFilters } from "@/components/operator/SupervisorReportsFilters";
import { FileText, DollarSign } from "lucide-react";

export default function OperatorReportsPage() {
  const { user, userRole, isLoading } = useAdminAuth();
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  
  const isSupervisor = userRole?.role === 'supervisor' || userRole?.role === 'admin';
  
  // Para operadores regulares, usar su propio user.id
  // Para supervisores, usar selectedOperatorId (puede ser null para ver todos)
  const effectiveOperatorId = isSupervisor ? selectedOperatorId : user?.id;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  const canAccessReports = userRole?.role === 'operador' || userRole?.role === 'supervisor' || userRole?.role === 'admin';
  
  if (!user || !canAccessReports) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Acceso denegado. Solo operadores y supervisores pueden ver esta página.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Reportes</h1>
          <p className="text-muted-foreground">Consulta los reportes de cobros y transacciones</p>
        </div>

        <Tabs defaultValue="cash" className="space-y-4">
          <TabsList className={`grid w-full ${isSupervisor ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="cash" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cobros en Ventanilla
            </TabsTrigger>
            {isSupervisor && (
              <TabsTrigger value="daily" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Cobros del Día
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="cash">
            <Card>
              <CardHeader>
                <CardTitle>Reporte de Cobros en Ventanilla</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isSupervisor 
                    ? "Muestra los cobros en ventanilla de todos los operadores o filtrados por operador específico"
                    : "Muestra únicamente los cobros en ventanilla realizados por ti"
                  }
                </p>
                {isSupervisor && (
                  <div className="mt-4">
                    <SupervisorReportsFilters 
                      onOperatorChange={setSelectedOperatorId}
                      selectedOperatorId={selectedOperatorId}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <CashReportsOperator operatorId={effectiveOperatorId} />
              </CardContent>
            </Card>
          </TabsContent>

          {isSupervisor && (
            <TabsContent value="daily">
              <Card>
                <CardHeader>
                  <CardTitle>Reporte de Cobros del Día</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Incluye todos los cobros del día de todos los operadores o filtrados por operador específico
                  </p>
                  <div className="mt-4">
                    <SupervisorReportsFilters 
                      onOperatorChange={setSelectedOperatorId}
                      selectedOperatorId={selectedOperatorId}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <DailyReportsOperator operatorId={effectiveOperatorId} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}