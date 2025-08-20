import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

export function TemporaryCleanupButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleCleanup = async () => {
    setIsLoading(true);
    console.log('🧹 Starting manual cleanup...');

    try {
      const { data, error } = await supabase.functions.invoke('cleanup-expired-bookings-manual');
      
      if (error) {
        console.error('❌ Cleanup error:', error);
        toast.error(`Error en limpieza: ${error.message}`);
        return;
      }

      console.log('✅ Cleanup result:', data);
      
      if (data?.success) {
        toast.success(
          `✅ Limpieza exitosa: ${data.expired_bookings_deleted + data.aug21_bookings_deleted} reservas eliminadas`
        );
        
        // Log details
        console.log('📊 Cleanup details:', {
          expired_deleted: data.expired_bookings_deleted,
          aug21_deleted: data.aug21_bookings_deleted,
          deleted_bookings: data.deleted_bookings
        });
      } else {
        toast.error('❌ Error en la limpieza');
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleCleanup}
        disabled={isLoading}
        variant="destructive"
        size="sm"
        className="shadow-lg"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Trash2 className="h-4 w-4 mr-2" />
        )}
        {isLoading ? 'Limpiando...' : 'Limpiar Reservas Expiradas'}
      </Button>
    </div>
  );
}