import { useState } from "react";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/admin/AdminButton";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AddCourtFormProps = {
  onAddCourt: (name: string) => Promise<void>;
  loading: boolean;
};

export function AddCourtForm({ onAddCourt, loading }: AddCourtFormProps) {
  const [newCourtName, setNewCourtName] = useState("");

  const handleSubmit = async () => {
    if (!newCourtName.trim()) return;
    await onAddCourt(newCourtName);
    setNewCourtName("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="relative flex-1 w-full sm:max-w-sm">
        <Input
          placeholder="Nombre de la cancha"
          value={newCourtName}
          onChange={(e) => setNewCourtName(e.target.value)}
          className="w-full pl-4 h-11 border-gray-200 focus:border-primary focus:ring-primary"
        />
      </div>
      <AdminButton
        onClick={handleSubmit}
        disabled={loading || !newCourtName.trim()}
        size="lg"
        icon={<Plus className="w-5 h-5" />}
        fullWidth
        className="w-full sm:w-auto"
      >
        Agregar cancha
      </AdminButton>
    </div>
  );
}