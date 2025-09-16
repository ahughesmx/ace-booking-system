import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Upload, Users } from "lucide-react";
import * as XLSX from 'xlsx';

interface BulkUserUploadProps {
  onSuccess?: () => void;
}

export function BulkUserUpload({ onSuccess }: BulkUserUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const downloadTemplate = () => {
    const templateData = [
      {
        'Clave de Socio': 'SOC001',
        'Nombre Completo': 'Juan Pérez García',
        'Email': 'juan.perez@email.com',
        'Teléfono': '+52 55 1234 5678',
        'Es Titular de Membresía': 'SI',
        'Contraseña': 'TempPass123'
      },
      {
        'Clave de Socio': 'SOC001',
        'Nombre Completo': 'María Pérez López',
        'Email': 'maria.perez@email.com',
        'Teléfono': '+52 55 8765 4321',
        'Es Titular de Membresía': 'NO',
        'Contraseña': 'TempPass456'
      },
      {
        'Clave de Socio': 'SOC002',
        'Nombre Completo': 'Carlos Rodríguez',
        'Email': 'carlos.rodriguez@email.com',
        'Teléfono': '+52 55 9999 0000',
        'Es Titular de Membresía': 'SI',
        'Contraseña': 'TempPass789'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Usuarios');
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 15 }, // Clave de Socio
      { wch: 25 }, // Nombre Completo
      { wch: 30 }, // Email
      { wch: 18 }, // Teléfono
      { wch: 20 }, // Es Titular
      { wch: 15 }  // Contraseña
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'plantilla_usuarios.xlsx');
    
    toast({
      title: "Plantilla descargada",
      description: "La plantilla de carga masiva de usuarios ha sido descargada exitosamente.",
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
          selectedFile.type !== 'application/vnd.ms-excel') {
        toast({
          title: "Tipo de archivo inválido",
          description: "Por favor selecciona un archivo Excel (.xlsx o .xls).",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const processFile = async () => {
    if (!file) {
      toast({
        title: "No hay archivo seleccionado",
        description: "Por favor selecciona un archivo Excel para procesar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new Error("El archivo Excel está vacío o no tiene datos válidos.");
      }

      // Validar estructura del archivo
      const requiredColumns = ['Clave de Socio', 'Nombre Completo', 'Email', 'Teléfono', 'Es Titular de Membresía', 'Contraseña'];
      const firstRow = data[0] as any;
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));
      
      if (missingColumns.length > 0) {
        throw new Error(`Faltan las siguientes columnas: ${missingColumns.join(', ')}`);
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Procesar cada usuario
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any;
        
        try {
          const userData = {
            member_id: row['Clave de Socio']?.toString().trim(),
            full_name: row['Nombre Completo']?.toString().trim(),
            email: row['Email']?.toString().trim().toLowerCase(),
            phone: row['Teléfono']?.toString().trim(),
            password: row['Contraseña']?.toString().trim(),
            is_membership_holder: row['Es Titular de Membresía']?.toString().toUpperCase() === 'SI'
          };

          // Validaciones básicas
          if (!userData.member_id || !userData.full_name || !userData.email || !userData.password) {
            throw new Error(`Fila ${i + 2}: Faltan datos obligatorios`);
          }

          if (!userData.email.includes('@')) {
            throw new Error(`Fila ${i + 2}: Email inválido`);
          }

          if (userData.password.length < 6) {
            throw new Error(`Fila ${i + 2}: La contraseña debe tener al menos 6 caracteres`);
          }

          // Insertar directamente en user_registration_requests para crear solicitudes pendientes
          const { error } = await supabase
            .from('user_registration_requests')
            .insert({
              member_id: userData.member_id,
              full_name: userData.full_name,
              email: userData.email,
              phone: userData.phone,
              password: userData.password,
              password_provided: true,
              is_migration: true
            });

          if (error) {
            throw new Error(`Fila ${i + 2}: ${error.message}`);
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(error.message);
          console.error(`Error procesando fila ${i + 2}:`, error);
        }
      }

      // Mostrar resumen
      if (successCount > 0) {
        toast({
          title: "Carga masiva completada",
          description: `${successCount} solicitudes de migración creadas exitosamente${errorCount > 0 ? `. ${errorCount} errores encontrados.` : '.'}`,
        });
      }

      if (errors.length > 0) {
        console.log("Errores durante la carga:", errors);
        toast({
          title: "Errores durante la carga",
          description: `${errorCount} solicitudes no pudieron ser creadas. Revisa la consola para más detalles.`,
          variant: "destructive",
        });
      }

      setFile(null);
      if (onSuccess && successCount > 0) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "Error al procesar archivo",
        description: error.message || "Ocurrió un error inesperado al procesar el archivo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button 
          onClick={downloadTemplate} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Descargar Plantilla
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="excel-file">Archivo Excel</Label>
          <Input
            id="excel-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="mt-1"
          />
          {file && (
            <p className="text-sm text-muted-foreground mt-1">
              Archivo seleccionado: {file.name}
            </p>
          )}
        </div>

        <Button 
          onClick={processFile}
          disabled={!file || isLoading}
          className="w-full"
        >
          <Users className="h-4 w-4 mr-2" />
          {isLoading ? 'Procesando solicitudes...' : 'Crear Solicitudes de Migración'}
        </Button>
      </div>

      <div className="bg-muted p-4 rounded-lg text-sm">
        <h4 className="font-medium mb-2">Instrucciones:</h4>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Descarga la plantilla Excel y llénala con los datos de los usuarios</li>
          <li>Puedes agregar múltiples usuarios para la misma clave de socio (membresías familiares)</li>
          <li>Solo UN usuario por membresía puede ser marcado como "Titular" (SI en la columna correspondiente)</li>
          <li>Todos los campos son obligatorios excepto el teléfono</li>
          <li>Las contraseñas deben tener al menos 6 caracteres</li>
          <li>Los emails deben ser únicos en todo el sistema</li>
          <li><strong>Las solicitudes se crearán como pendientes y deben ser aprobadas manualmente</strong></li>
        </ul>
      </div>
    </div>
  );
}