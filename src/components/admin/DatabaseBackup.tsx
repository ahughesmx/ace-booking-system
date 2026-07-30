import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, Download, FileCode, Loader2, ShieldAlert } from "lucide-react";

type BackupSummary = {
  generated_at: string;
  total_records: number;
  tables: Record<string, number>;
};

export default function DatabaseBackup() {
  const [loadingFormat, setLoadingFormat] = useState<"json" | "sql" | null>(null);
  const [lastBackup, setLastBackup] = useState<BackupSummary | null>(null);
  const { toast } = useToast();

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBackup = async (format: "json" | "sql") => {
    try {
      setLoadingFormat(format);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no válida. Inicia sesión nuevamente.");

      const { data, error } = await supabase.functions.invoke("database-backup", {
        body: { format },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message || "No se pudo generar el respaldo");
      if (!data || (data as any).error) throw new Error((data as any)?.error || "Respuesta vacía");

      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

      if (format === "sql") {
        downloadFile((data as any).sql, `respaldo-cdv-${stamp}.sql`, "text/plain;charset=utf-8");
      } else {
        downloadFile(
          JSON.stringify(data, null, 2),
          `respaldo-cdv-${stamp}.json`,
          "application/json"
        );
      }

      setLastBackup((data as any).metadata as BackupSummary);

      toast({
        title: "Respaldo generado",
        description: `Se descargaron ${(data as any).metadata.total_records} registros en formato ${format.toUpperCase()}.`,
      });
    } catch (err: any) {
      console.error("Error generando respaldo:", err);
      toast({
        title: "Error al generar el respaldo",
        description: err.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setLoadingFormat(null);
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border p-4 space-y-3">
              <div>
                <p className="font-medium">Respaldo de datos (JSON)</p>
                <p className="text-sm text-muted-foreground">
                  Incluye todas las tablas más el listado de cuentas de acceso. Ideal para
                  auditoría y recuperación parcial.
                </p>
              </div>
              <Button
                onClick={() => handleBackup("json")}
                disabled={loadingFormat !== null}
                className="w-full"
              >
                {loadingFormat === "json" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar JSON
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-md border p-4 space-y-3">
              <div>
                <p className="font-medium">Respaldo restaurable (SQL)</p>
                <p className="text-sm text-muted-foreground">
                  Archivo <code>.sql</code> con INSERTs ordenados por dependencias. Se pega en el
                  SQL Editor de Supabase para restaurar todo de una vez.
                </p>
              </div>
              <Button
                onClick={() => handleBackup("sql")}
                disabled={loadingFormat !== null}
                variant="secondary"
                className="w-full"
              >
                {loadingFormat === "sql" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileCode className="mr-2 h-4 w-4" />
                    Descargar SQL restaurable
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            El SQL usa <code>ON CONFLICT DO NOTHING</code>, por lo que no sobrescribe registros
            existentes. Las cuentas de acceso (auth) solo viajan en el JSON.
          </p>

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