import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
            Inicia sesión o regístrate para acceder al sistema de gestión de partidos
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  link_text: "¿Ya tienes una cuenta? Inicia sesión",
                },
                sign_up: {
                  email_label: "Correo electrónico",
                  password_label: "Contraseña",
                  button_label: "Registrarse",
                  email_input_placeholder: "tucorreo@ejemplo.com",
                  password_input_placeholder: "Crea una contraseña",
                  link_text: "¿No tienes una cuenta? Regístrate",
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}