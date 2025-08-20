import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase-client";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const from = location.state?.from || "/";
  const [showRegister, setShowRegister] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState<string>("");

  // Estado para el registro
  const [memberId, setMemberId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      // Redirigir al usuario a la página que intentaba acceder
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
        setError("Email o contraseña incorrectos");
      }
    } catch (err) {
      setError("Error al iniciar sesión");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validación de teléfono
    if (phone.length !== 10) {
      setError("El celular debe tener exactamente 10 dígitos");
      return;
    }

    try {
      const { data: validMember } = await supabase
        .from('valid_member_ids')
        .select('member_id')
        .eq('member_id', memberId)
        .single();

      if (!validMember) {
        setError("Clave de socio inválida");
        return;
      }

      // Check for existing registration request with same phone
      const { data: existingRequest, error: checkRequestError } = await supabase
        .from('user_registration_requests')
        .select('id, status, full_name')
        .eq('phone', phone)
        .eq('status', 'pending')
        .single();

      if (existingRequest && !checkRequestError) {
        setError(`Ya existe una solicitud pendiente para el teléfono ${phone} (${existingRequest.full_name})`);
        return;
      }

      // Check if user already exists with this phone and member_id
      const { data: existingProfile, error: checkProfileError } = await supabase
        .from('profiles')
        .select('id, full_name, member_id')
        .eq('phone', phone)
        .eq('member_id', memberId)
        .single();

      if (existingProfile && !checkProfileError) {
        setError(`El teléfono ${phone} ya está registrado para ${existingProfile.full_name} con la clave ${memberId}`);
        return;
      }

      // Crear solicitud de registro usando el nuevo modelo seguro
      const { error } = await supabase
        .from('user_registration_requests')
        .insert({
          member_id: memberId,
          full_name: fullName,
          phone: phone,
          email: email,
          password_provided: true, // Usar el nuevo campo boolean
          status: 'pending'
        });

      if (error) {
        console.error("Error creating registration request:", error);
        setError("Error al enviar solicitud de registro");
      } else {
        setError(""); // Limpiar errores
        alert("Solicitud de registro enviada. Un administrador revisará tu solicitud y te notificarán por WhatsApp.");
        setShowRegister(false);
        // Limpiar campos
        setMemberId("");
        setFullName("");
        setPhone("");
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Error al enviar solicitud de registro");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {showRegister ? (
          <RegisterForm
            memberId={memberId}
            setMemberId={setMemberId}
            fullName={fullName}
            setFullName={setFullName}
            phone={phone}
            setPhone={setPhone}
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