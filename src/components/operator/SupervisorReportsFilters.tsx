import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";

interface SupervisorReportsFiltersProps {
  onOperatorChange: (operatorId: string | null) => void;
  selectedOperatorId: string | null;
}

interface Operator {
  id: string;
  full_name: string | null;
}

export function SupervisorReportsFilters({ onOperatorChange, selectedOperatorId }: SupervisorReportsFiltersProps) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      setLoading(true);
      
      // Obtener todos los usuarios con rol 'operador'
      const { data: operatorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'operador');

      if (rolesError) throw rolesError;

      if (!operatorRoles || operatorRoles.length === 0) {
        setOperators([]);
        return;
      }

      const operatorIds = operatorRoles.map(r => r.user_id);

      // Obtener perfiles de estos usuarios
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', operatorIds)
        .order('full_name');

      if (profilesError) throw profilesError;

      setOperators(profiles || []);
    } catch (error) {
      console.error('Error fetching operators:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los operadores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="operator-filter">Filtrar por Operador</Label>
      <Select
        value={selectedOperatorId || "all"}
        onValueChange={(value) => onOperatorChange(value === "all" ? null : value)}
        disabled={loading}
      >
        <SelectTrigger id="operator-filter" className="w-full sm:w-[250px]">
          <SelectValue placeholder={loading ? "Cargando..." : "Seleccionar operador"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los operadores</SelectItem>
          {operators.map((operator) => (
            <SelectItem key={operator.id} value={operator.id}>
              {operator.full_name || 'Sin nombre'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
