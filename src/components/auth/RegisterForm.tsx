import { Mail, UserPlus, User, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface RegisterFormProps {
  memberId: string;
  setMemberId: (value: string) => void;
  fullName: string;
  setFullName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onShowLogin: () => void;
  error?: string;
  isLoading?: boolean;
}

export function RegisterForm({
  memberId,
  setMemberId,
  fullName,
  setFullName,
  phone,
  setPhone,
  email,
  setEmail,
  onSubmit,
  onShowLogin,
  error,
  isLoading = false,
}: RegisterFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="member_id">Clave de Socio</Label>
        <Input
          id="member_id"
          type="text"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          placeholder="Tu clave de socio"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre Completo</Label>
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <Input
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Tu nombre completo"
            className="pl-10"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Celular</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              if (value.length <= 10) {
                setPhone(value);
              }
            }}
            placeholder="1234567890"
            className="pl-10"
            maxLength={10}
            required
          />
        </div>
        {phone && phone.length !== 10 && (
          <p className="text-sm text-destructive">El celular debe tener exactamente 10 dígitos</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="pl-10"
            required
          />
        </div>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Después de que tu solicitud sea aprobada, recibirás un correo electrónico para establecer tu contraseña de forma segura.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        <UserPlus className="mr-2 h-4 w-4" /> 
        {isLoading ? "Enviando solicitud..." : "Registrarse"}
      </Button>
      <div className="text-center text-sm">
        <button
          type="button"
          onClick={onShowLogin}
          className="text-primary hover:underline"
        >
          ¿Ya tienes cuenta? Inicia sesión
        </button>
      </div>
    </form>
  );
}