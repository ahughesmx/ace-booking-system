import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, Download, Loader2, ShieldAlert } from "lucide-react";

type BackupSummary = {
  generated_at: string;
  total_records: number;
  tables: Record<string, number>;
};

export default function DatabaseBackup() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupSummary | null>(null);
  const { toast } = useToast();

  const handleBackup = async () => {
    try {
      setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no válida. Inicia sesión nuevamente.");

      const { data, error } = await supabase.functions.invoke("database-backup", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message || "No se pudo generar el respaldo");
      if (!data || (data as any).error) throw new Error((data as any)?.error || "Respuesta vacía");

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const link = document.createElement("a");
      link.href = url;
      link.download = `respaldo-cdv-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastBackup((data as any).metadata as BackupSummary);

      toast({
        title: "Respaldo generado",
        description: `Se descargaron ${(data as any).metadata.total_records} registros.`,
      });
    } catch (err: any) {
      console.error("Error generando respaldo:", err);
      toast({
        title: "Error al generar el respaldo",
        description: err.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Respaldo de Base de Datos</h1>
        <p className="text-muted-foreground">
          Descarga una copia completa de toda la información del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Respaldo completo
          </CardTitle>
          <CardDescription>
            Genera un archivo JSON con el 100% de los registros de todas las tablas (reservas,
            usuarios, perfiles, pagos, cursos, configuraciones, etc.) más el listado de cuentas de
            acceso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Información confidencial</AlertTitle>
            <AlertDescription>
              El archivo contiene datos personales de los socios. Guárdalo en un lugar seguro y no
              lo compartas. Las contraseñas nunca se incluyen.
            </AlertDescription>
          </Alert>

          <Button onClick={handleBackup} disabled={isLoading} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando respaldo...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Descargar respaldo completo
              </>
            )}
          </Button>

          {lastBackup && (
            <div className="rounded-md border p-4 space-y-2">
              <p className="text-sm font-medium">
                Último respaldo: {new Date(lastBackup.generated_at).toLocaleString("es-MX")} —{" "}
                {lastBackup.total_records} registros
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {Object.entries(lastBackup.tables).map(([table, count]) => (
                  <div key={table} className="flex justify-between gap-2">
                    <span className="truncate">{table}</span>
                    <span className="font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}