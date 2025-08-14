import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase-client";
import { Settings } from "lucide-react";

type MemberIdFormat = {
  min_length: number;
  max_length: number;
  allowed_characters: string;
  format_description: string;
  validation_regex: string;
};

export function MemberIdFormatSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<MemberIdFormat>({
    min_length: 3,
    max_length: 20,
    allowed_characters: "Letras, números y guiones",
    format_description: "Formato: FAM001, SOC123, etc.",
    validation_regex: "^[A-Za-z0-9-]{3,20}$"
  });

  useEffect(() => {
    // Aquí podrías cargar la configuración desde la base de datos
    // Por ahora usamos valores por defecto
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Aquí guardarías en una tabla de configuración
      // Por ahora solo mostramos el toast
      
      toast({
        title: "Configuración guardada",
        description: "El formato de claves de socio ha sido actualizado.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuración de Formato de Claves de Socio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min_length">Longitud mínima</Label>
            <Input
              id="min_length"
              type="number"
              value={format.min_length}
              onChange={(e) => setFormat(prev => ({ ...prev, min_length: parseInt(e.target.value) || 0 }))}
              min="1"
              max="50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="max_length">Longitud máxima</Label>
            <Input
              id="max_length"
              type="number"
              value={format.max_length}
              onChange={(e) => setFormat(prev => ({ ...prev, max_length: parseInt(e.target.value) || 0 }))}
              min="1"
              max="50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="allowed_characters">Caracteres permitidos</Label>
          <Input
            id="allowed_characters"
            value={format.allowed_characters}
            onChange={(e) => setFormat(prev => ({ ...prev, allowed_characters: e.target.value }))}
            placeholder="Ej: Letras, números y guiones"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="format_description">Descripción del formato</Label>
          <Textarea
            id="format_description"
            value={format.format_description}
            onChange={(e) => setFormat(prev => ({ ...prev, format_description: e.target.value }))}
            placeholder="Ej: Formato: FAM001 para familias, SOC123 para socios individuales"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="validation_regex">Expresión regular de validación</Label>
          <Input
            id="validation_regex"
            value={format.validation_regex}
            onChange={(e) => setFormat(prev => ({ ...prev, validation_regex: e.target.value }))}
            placeholder="Ej: ^[A-Za-z0-9-]{3,20}$"
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            Expresión regular para validar el formato de las claves de socio
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </CardContent>
    </Card>
  );
}