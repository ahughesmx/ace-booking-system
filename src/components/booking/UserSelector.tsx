import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { UserSearch } from "@/components/UserSearch";
import { useGlobalRole } from "@/hooks/use-global-role";
import { supabase } from "@/integrations/supabase/client";

interface UserSelectorProps {
  onUserSelect: (userId: string) => void;
  selectedUserId?: string;
  selectedUserName?: string;
}

export function UserSelector({ onUserSelect, selectedUserId, selectedUserName }: UserSelectorProps) {
  const [showSearch, setShowSearch] = useState(!selectedUserId);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  
  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id);
    });
  }, []);
  
  const { data: roleData } = useGlobalRole(currentUserId);

  const handleUserSelect = (userId: string) => {
    onUserSelect(userId);
    setShowSearch(false);
  };

  const handleChangeUser = () => {
    setShowSearch(true);
  };

  if (showSearch) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Seleccionar Usuario para la Reserva
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserSearch 
            onSelect={handleUserSelect}
            excludeIds={[]}
            placeholder={roleData?.role === 'operador' ? "Clave de socio (Cuenta)..." : "Buscar por nombre..."}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Usuario Seleccionado
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedUserName || "Usuario sin nombre"}
          </Badge>
        </div>
        <button
          onClick={handleChangeUser}
          className="text-sm text-primary hover:underline"
        >
          Cambiar usuario
        </button>
      </CardContent>
    </Card>
  );
}