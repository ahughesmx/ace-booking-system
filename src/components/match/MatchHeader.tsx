import { Plus, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MatchHeaderProps = {
  matchCount: number;
  isLoading: boolean;
  onCreateMatch: (isDoubles: boolean) => void;
};

export function MatchHeader({ matchCount, isLoading, onCreateMatch }: MatchHeaderProps) {
  return (
    <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partidos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {matchCount} partidos disponibles
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={isLoading}
              size="icon"
              className="md:hidden bg-[#0A1A2A] hover:bg-[#152538]"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCreateMatch(false)}>
              <User className="h-4 w-4 mr-2" />
              Partido Singles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateMatch(true)}>
              <Users className="h-4 w-4 mr-2" />
              Partido Dobles
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={isLoading}
            className="hidden md:flex bg-[#0A1A2A] hover:bg-[#152538]"
          >
            <Plus className="h-5 w-5 mr-2" />
            {isLoading ? "Creando..." : "Crear Partido"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onCreateMatch(false)}>
            <User className="h-4 w-4 mr-2" />
            Partido Singles
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCreateMatch(true)}>
            <Users className="h-4 w-4 mr-2" />
            Partido Dobles
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}