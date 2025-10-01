import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase-client";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

type UploadResult = {
  successful: string[];
  duplicates: string[];
  errors: { member_id: string; error: string }[];
};

type BulkUploadProps = {
  onSuccess: () => void;
};

export function BulkMemberIdUpload({ onSuccess }: BulkUploadProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["member_id"],
      ["Ejemplo: FAM001"],
      ["Ejemplo: FAM002"],
      ["Ejemplo: SOC123"]
    ]);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Claves de Socio");
    XLSX.writeFile(workbook, "plantilla_claves_socio.xlsx");
    
    toast({
      title: "Plantilla descargada",
      description: "La plantilla Excel ha sido descargada exitosamente.",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setUploadResult(null);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Obtener member_ids del archivo (saltar header)
      const memberIds = jsonData
        .slice(1)
        .map((row: any) => row[0])
        .filter((id: any) => id !== null && id !== undefined && String(id).trim() !== '')
        .map((id: any) => String(id).trim());

      if (memberIds.length === 0) {
        toast({
          title: "Error",
          description: "No se encontraron claves de socio válidas en el archivo.",
          variant: "destructive",
        });
        return;
      }

      // Verificar duplicados en el archivo
      const duplicatesInFile = memberIds.filter((id, index) => memberIds.indexOf(id) !== index);
      const uniqueMemberIds = [...new Set(memberIds)];

      // Verificar cuáles ya existen en la base de datos
      const { data: existingIds, error: checkError } = await supabase
        .from("valid_member_ids")
        .select("member_id")
        .in("member_id", uniqueMemberIds);

      if (checkError) throw checkError;

      const existingMemberIds = existingIds?.map(item => item.member_id) || [];
      const newMemberIds = uniqueMemberIds.filter(id => !existingMemberIds.includes(id));

      // Insertar nuevos member_ids
      const result: UploadResult = {
        successful: [],
        duplicates: [...new Set([...duplicatesInFile, ...existingMemberIds])],
        errors: []
      };

      if (newMemberIds.length > 0) {
        const { error: insertError } = await supabase
          .from("valid_member_ids")
          .insert(newMemberIds.map(member_id => ({ member_id })));

        if (insertError) {
          result.errors.push({ member_id: "Varios", error: insertError.message });
        } else {
          result.successful = newMemberIds;
        }
      }

      setUploadResult(result);
      
      if (result.successful.length > 0) {
        toast({
          title: "Carga completada",
          description: `Se agregaron ${result.successful.length} claves de socio exitosamente.`,
        });
        onSuccess();
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Error al procesar el archivo Excel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      // Limpiar el input
      event.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Carga Masiva de Claves de Socio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Descargar Plantilla Excel
          </Button>
          
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
              id="excel-upload"
            />
            <Button
              variant="default"
              asChild
              disabled={loading}
              className="flex items-center gap-2"
            >
              <label htmlFor="excel-upload" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                {loading ? "Procesando..." : "Subir Archivo Excel"}
              </label>
            </Button>
          </div>
        </div>

        {uploadResult && (
          <div className="space-y-3">
            {uploadResult.successful.length > 0 && (
              <Alert>
                <AlertDescription>
                  <strong>Exitosos ({uploadResult.successful.length}):</strong>
                  <br />
                  {uploadResult.successful.join(", ")}
                </AlertDescription>
              </Alert>
            )}

            {uploadResult.duplicates.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Duplicados o ya existentes ({uploadResult.duplicates.length}):</strong>
                  <br />
                  {uploadResult.duplicates.join(", ")}
                </AlertDescription>
              </Alert>
            )}

            {uploadResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Errores:</strong>
                  {uploadResult.errors.map((error, index) => (
                    <div key={index}>
                      {error.member_id}: {error.error}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}