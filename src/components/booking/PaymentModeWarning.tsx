import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface PaymentModeWarningProps {
  isTestMode: boolean;
}

export function PaymentModeWarning({ isTestMode }: PaymentModeWarningProps) {
  if (!isTestMode) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
      <AlertTriangle className="h-5 w-5 text-orange-600" />
      <AlertTitle className="text-orange-900 dark:text-orange-100 font-bold">
        MODO DE PRUEBA ACTIVO
      </AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        Esta pasarela de pago está en modo de prueba. No se procesarán cargos reales. 
        Use la tarjeta de prueba: <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">4242 4242 4242 4242</code>
      </AlertDescription>
    </Alert>
  );
}
