import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase-client";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const from = location.state?.from || "/";
  const [showRegister, setShowRegister] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState<string>("");

  // Estado para el registro (password removed for security)
  const [memberId, setMemberId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Estado para el modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
    console.log("🟢 [INICIO] Botón Registrar presionado");
    e.preventDefault();
    setError("");
    setIsRegistering(true);

    console.log("🟢 [PASO 1] Valores del formulario (sin limpiar):", { 
      memberId: `"${memberId}"`, 
      fullName: `"${fullName}"`, 
      phone: `"${phone}"`, 
      email: `"${email}"` 
    });

    // Limpiar y validar campos
    const cleanMemberId = memberId.trim();
    const cleanFullName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    console.log("🔵 [PASO 2] Valores limpiados:", { 
      cleanMemberId: `"${cleanMemberId}"`,
      cleanFullName: `"${cleanFullName}"`,
      cleanPhone: `"${cleanPhone}"`,
      cleanEmail: `"${cleanEmail}"`
    });

    // Validar campos no vacíos
    console.log("🔍 [PASO 3] Validando campos no vacíos...");
    if (!cleanMemberId || !cleanFullName || !cleanPhone || !cleanEmail) {
      console.error("❌ [ERROR PASO 3] Campos vacíos detectados:", {
        cleanMemberId: cleanMemberId || "(vacío)",
        cleanFullName: cleanFullName || "(vacío)",
        cleanPhone: cleanPhone || "(vacío)",
        cleanEmail: cleanEmail || "(vacío)"
      });
      setError("Todos los campos son obligatorios");
      setIsRegistering(false);
      return;
    }
    console.log("✅ [PASO 3] Todos los campos tienen valor");

    // Validación de teléfono
    console.log("🔍 [PASO 4] Validando longitud de teléfono:", cleanPhone.length);
    if (cleanPhone.length !== 10) {
      console.error("❌ [ERROR PASO 4] Teléfono inválido. Longitud:", cleanPhone.length);
      setError("El celular debe tener exactamente 10 dígitos");
      setIsRegistering(false);
      return;
    }
    console.log("✅ [PASO 4] Teléfono válido");

    try {
      console.log("🔍 [PASO 5] Iniciando consulta a valid_member_ids");
      console.log("🔍 [PASO 5] Valor a buscar:", `"${cleanMemberId}"`);
      
      console.log("🔵 [PASO 5] Invocando edge function con memberId:", cleanMemberId);
      
      const { data: validateRes, error: validateError } = await supabase.functions.invoke('validate-member-id', {
        body: { memberId: cleanMemberId }
      });

      console.log("🔍 [PASO 5] Respuesta completa de edge function:", {
        data: validateRes,
        error: validateError,
        dataType: typeof validateRes,
        errorType: typeof validateError,
        validateResValid: validateRes?.valid,
        isValid: !!validateRes?.valid,
        hasError: !!validateError
      });

      if (!validateRes?.valid || validateError) {
        console.error("❌ [ERROR PASO 5] Clave de socio inválida:", { 
          validateError, 
          searchedValue: `"${cleanMemberId}"`,
          errorMessage: (validateError as any)?.message,
          errorDetails: (validateError as any)?.details,
          errorHint: (validateError as any)?.hint
        });
        setError(`Clave de socio "${cleanMemberId}" inválida. Verifica que sea correcta.`);
        setIsRegistering(false);
        return;
      }
      
      console.log("✅ [PASO 5] Clave de socio válida encontrada:", validateRes);

      // Check for existing registration request with same phone
      console.log("🔍 [PASO 6] Verificando solicitudes existentes con teléfono:", cleanPhone);
      const { data: existingRequest, error: checkRequestError } = await supabase
        .from('user_registration_requests')
        .select('id, status, full_name')
        .eq('phone', cleanPhone)
        .eq('status', 'pending')
        .maybeSingle();

      console.log("🔍 [PASO 6] Resultado:", {
        data: existingRequest,
        error: checkRequestError,
        hasExistingRequest: !!existingRequest
      });

      if (existingRequest && !checkRequestError) {
        console.error("❌ [ERROR PASO 6] Ya existe solicitud pendiente:", existingRequest);
        setError(`Ya existe una solicitud pendiente para el teléfono ${cleanPhone} (${existingRequest.full_name})`);
        setIsRegistering(false);
        return;
      }
      console.log("✅ [PASO 6] No hay solicitudes pendientes");

      // Check if user already exists with this phone and member_id
      console.log("🔍 [PASO 7] Verificando perfil existente...");
      const { data: existingProfile, error: checkProfileError } = await supabase
        .from('profiles')
        .select('id, full_name, member_id')
        .eq('phone', cleanPhone)
        .eq('member_id', cleanMemberId)
        .maybeSingle();

      console.log("🔍 [PASO 7] Resultado:", {
        data: existingProfile,
        error: checkProfileError,
        hasExistingProfile: !!existingProfile
      });

      if (existingProfile && !checkProfileError) {
        console.error("❌ [ERROR PASO 7] Usuario ya registrado:", existingProfile);
        setError(`El teléfono ${cleanPhone} ya está registrado para ${existingProfile.full_name} con la clave ${cleanMemberId}`);
        setIsRegistering(false);
        return;
      }
      console.log("✅ [PASO 7] Usuario no existe previamente");

      // Create registration request - user will set password via email
      console.log("📝 [PASO 8] Creando solicitud de registro con datos:", {
        member_id: cleanMemberId,
        full_name: cleanFullName,
        phone: cleanPhone,
        email: cleanEmail,
        status: 'pending',
        password_provided: false
      });

      const { error: insertError } = await supabase
        .from('user_registration_requests')
        .insert({
          member_id: cleanMemberId,
          full_name: cleanFullName,
          phone: cleanPhone,
          email: cleanEmail,
          status: 'pending',
          password_provided: false
        });

      console.log("🔍 [PASO 8] Resultado de la inserción:", {
        error: insertError,
        hasError: !!insertError,
        errorMessage: insertError?.message,
        errorDetails: insertError?.details,
        errorHint: insertError?.hint
      });

      if (insertError) {
        console.error("❌ [ERROR PASO 8] Error al crear solicitud:", insertError);
        setError("Error al enviar solicitud de registro: " + insertError.message);
        setIsRegistering(false);
      } else {
        console.log("✅ [PASO 8] Solicitud de registro creada exitosamente");
        console.log("🎉 [FIN] Proceso completado exitosamente");
        setError("");
        setShowSuccessModal(true);
        setShowRegister(false);
        setMemberId("");
        setFullName("");
        setPhone("");
        setEmail("");
        setIsRegistering(false);
      }
    } catch (err) {
      console.error("❌ [EXCEPCIÓN] Error no manejado:", err);
      console.error("❌ [EXCEPCIÓN] Stack trace:", err instanceof Error ? err.stack : "No stack available");
      setError("Error al enviar solicitud de registro: " + (err instanceof Error ? err.message : String(err)));
      setIsRegistering(false);
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
            onSubmit={handleRegisterSubmit}
            onShowLogin={() => setShowRegister(false)}
            error={error}
            isLoading={isRegistering}
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
      
      {/* Modal de éxito del registro */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              Solicitud de registro enviada
            </DialogTitle>
            <DialogDescription className="text-center mt-2">
              Un administrador revisará tu solicitud. Una vez aprobada, recibirás un correo electrónico para establecer tu contraseña de forma segura.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button 
              onClick={() => setShowSuccessModal(false)}
              className="min-w-[100px]"
            >
              Aceptar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}