import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import MainNav from "@/components/MainNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthError, AuthApiError } from "@supabase/supabase-js";

export default function Login() {
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const { toast } = useToast();

  const getErrorMessage = (error: AuthError) => {
    if (error instanceof AuthApiError) {
      switch (error.status) {
        case 400:
          if (error.message.includes("Invalid login credentials")) {
            return "Email o contraseña incorrectos. Por favor verifica tus datos.";
          }
          break;
        case 422:
          return "Por favor ingresa un email válido.";
        case 429:
          return "Demasiados intentos. Por favor espera unos minutos.";
      }
    }
    return "Error al iniciar sesión. Por favor intenta de nuevo.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        toast({
          title: "Error",
          description: getErrorMessage(error),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente",
      });
      
      navigate("/");
    } catch (error) {
      console.error("Error during login:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      });
    }
  };

  const handleShowRegister = () => {
    navigate("/register");
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <LoginForm
            loginEmail={loginEmail}
            setLoginEmail={setLoginEmail}
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            onSubmit={handleSubmit}
            onShowRegister={handleShowRegister}
          />
        </div>
      </div>
    </div>
  );
}