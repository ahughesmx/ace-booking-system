import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase-client";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthError } from "@supabase/supabase-js";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const from = location.state?.from || "/";
  const [showRegister, setShowRegister] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState<string>("");

  // Add new state variables for registration
  const [memberId, setMemberId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        switch (error.message) {
          case "Invalid login credentials":
            setError("Email o contraseña incorrectos");
            break;
          case "Email not confirmed":
            setError("Por favor verifica tu correo electrónico antes de iniciar sesión");
            break;
          default:
            setError("Error al iniciar sesión. Por favor intenta de nuevo");
        }
      }
    } catch (err) {
      const error = err as AuthError;
      setError("Error al iniciar sesión. Por favor intenta de nuevo");
      console.error("Login error:", error);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // First check if member ID is valid
      const { data: validMember, error: validationError } = await supabase
        .from('valid_member_ids')
        .select('member_id')
        .eq('member_id', memberId)
        .single();

      if (validationError || !validMember) {
        setError("Clave de socio inválida");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            member_id: memberId,
          },
        },
      });

      if (error) {
        switch (error.message) {
          case "User already registered":
            setError("Este correo ya está registrado");
            break;
          case "Password should be at least 6 characters":
            setError("La contraseña debe tener al menos 6 caracteres");
            break;
          default:
            setError("Error al registrar. Por favor intenta de nuevo");
        }
      } else {
        setError(""); // Clear any errors
        setShowRegister(false); // Switch back to login view
      }
    } catch (err) {
      const error = err as AuthError;
      setError("Error al registrar. Por favor intenta de nuevo");
      console.error("Registration error:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {showRegister ? (
          <RegisterForm
            memberId={memberId}
            setMemberId={setMemberId}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onSubmit={handleRegisterSubmit}
            onShowLogin={() => setShowRegister(false)}
          />
        ) : (
          <LoginForm
            loginEmail={loginEmail}
            setLoginEmail={setLoginEmail}
            loginPassword={loginPassword}
            setLoginPassword={setLoginPassword}
            onSubmit={handleLoginSubmit}
            onShowRegister={() => setShowRegister(true)}
            error={error}
          />
        )}
      </div>
    </div>
  );
}