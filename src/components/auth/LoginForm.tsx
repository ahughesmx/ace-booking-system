import { Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoginFormProps {
  loginEmail: string;
  setLoginEmail: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onShowRegister: () => void;
  error?: string;
}

export function LoginForm({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  onSubmit,
  onShowRegister,
  error,
}: LoginFormProps) {
  return (
    <Card className="w-full border shadow-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Club de Tenis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Inicia sesión para acceder al sistema
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button className="w-full bg-[#0f172a] hover:bg-[#1e293b]" type="submit">
            Iniciar Sesión
          </Button>
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={onShowRegister}
              className="text-primary hover:underline"
            >
              ¿No tienes cuenta? Regístrate
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}