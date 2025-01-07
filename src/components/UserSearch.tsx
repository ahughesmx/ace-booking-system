import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type UserSearchProps = {
  onSelect: (userId: string) => void;
  excludeIds?: string[];
};

export function UserSearch({ onSelect, excludeIds = [] }: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; full_name: string | null }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("full_name", `%${searchTerm}%`)
        .not("id", "in", `(${excludeIds.join(",")})`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button 
          onClick={handleSearch}
          disabled={isSearching}
        >
          Buscar
        </Button>
      </div>

      {searchResults.length > 0 ? (
        <div className="space-y-2">
          {searchResults.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => onSelect(user.id)}
            >
              {user.full_name || "Usuario sin nombre"}
            </Button>
          ))}
        </div>
      ) : searchTerm && !isSearching ? (
        <p className="text-sm text-muted-foreground text-center">
          No se encontraron usuarios
        </p>
      ) : null}
    </div>
  );
}