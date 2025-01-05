import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const [memberId, setMemberId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Verificar si la clave de socio es válida
      const { data: validMember, error: validationError } = await supabase
        .from('valid_member_ids')
        .select('member_id')
        .eq('member_id', memberId)
        .single();

      if (validationError || !validMember) {
        toast({
          title: "Error",
          description: "La clave de socio no es válida",
          variant: "destructive",
        });
        return;
      }

      // Verificar si la clave ya está en uso
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('member_id')
        .eq('member_id', memberId)
        .single();

      if (existingProfile) {
        toast({
          title: "Error",
          description: "Esta clave de socio ya está registrada",
          variant: "destructive",
        });
        return;
      }

      // Crear el usuario
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            member_id: memberId,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <LogIn className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">
              Club de Tenis
            </CardTitle>
          </div>
          <CardDescription className="text-center">
            Inicia sesión o regístrate para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="member_id">Clave de Socio</Label>
                <Input
                  id="member_id"
                  type="text"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Registrarse
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  O inicia sesión
                </span>
              </div>
            </div>

            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'rgb(37 99 235)',
                      brandAccent: 'rgb(29 78 216)',
                    },
                  },
                },
                className: {
                  container: 'w-full',
                  button: 'w-full',
                  input: 'rounded-md',
                },
              }}
              providers={[]}
              localization={{
                variables: {
                  sign_in: {
                    email_label: "Correo electrónico",
                    password_label: "Contraseña",
                    button_label: "Iniciar sesión",
                    email_input_placeholder: "tucorreo@ejemplo.com",
                    password_input_placeholder: "Tu contraseña",
                  },
                },
              }}
              view="sign_in"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}