
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminButton } from "@/components/admin/AdminButton";
import { Plus } from "lucide-react";

type AddCourtFormProps = {
  onAddCourt: (name: string, courtType: 'tennis' | 'padel') => Promise<void>;
  loading: boolean;
};

export function AddCourtForm({ onAddCourt, loading }: AddCourtFormProps) {
  const [newCourtName, setNewCourtName] = useState("");
  const [courtType, setCourtType] = useState<'tennis' | 'padel'>('tennis');

  const handleSubmit = async () => {
    if (!newCourtName.trim()) return;
    await onAddCourt(newCourtName, courtType);
    setNewCourtName("");
    setCourtType('tennis');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Input
            placeholder="Nombre de la cancha"
            value={newCourtName}
            onChange={(e) => setNewCourtName(e.target.value)}
            className="w-full pl-4 h-11 border-gray-200 focus:border-primary focus:ring-primary"
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[150px]">
          <Select value={courtType} onValueChange={(value: 'tennis' | 'padel') => setCourtType(value)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tennis">Tenis</SelectItem>
              <SelectItem value="padel">Pádel</SelectItem>
            </SelectContent>
          </Select>
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
    </div>
  );
}
