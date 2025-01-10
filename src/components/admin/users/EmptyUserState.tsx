import { AlertCircle } from "lucide-react";

interface EmptyUserStateProps {
  searchTerm?: string;
}

export const EmptyUserState = ({ searchTerm }: EmptyUserStateProps) => {
  return (
    <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      {searchTerm ? (
        <>
          <p className="text-lg font-medium">No se encontraron usuarios</p>
          <p className="text-sm text-muted-foreground">
            No hay resultados para "{searchTerm}"
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-medium">No hay usuarios registrados</p>
          <p className="text-sm text-muted-foreground">
            Los usuarios aparecerán aquí cuando se registren en la plataforma
          </p>
        </>
      )}
    </div>
  );
};