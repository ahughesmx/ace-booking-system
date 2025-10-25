
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isSigningOut: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isSigningOut: false,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          console.log("Auth event:", event, "isInitialLoad:", isInitialLoad);
          
          if (currentSession?.user) {
            // Establecer sesión inmediatamente (sincrónico)
            setSession(currentSession);
            setUser(currentSession.user);
            
            // Diferir la verificación de usuario inactivo para evitar deadlocks
            setTimeout(async () => {
              try {
                const { data: profile, error } = await supabase
                  .from('profiles')
                  .select('is_active, full_name')
                  .eq('id', currentSession.user.id)
                  .single();

                if (error) {
                  console.error("Error fetching user profile:", error);
                  // Si no se puede verificar el perfil, cerrar sesión por seguridad
                  cleanupAuthState();
                  setSession(null);
                  setUser(null);
                  
                  toast({
                    title: "Error de autenticación",
                    description: "No se pudo verificar el estado de tu cuenta",
                    variant: "destructive",
                  });
                  return;
                }

                // Si el usuario está inactivo, cerrar sesión inmediatamente
                if (!profile?.is_active) {
                  console.log("Usuario inactivo detectado, cerrando sesión");
                  cleanupAuthState();
                  await supabase.auth.signOut();
                  setSession(null);
                  setUser(null);
                  
                  toast({
                    title: "Usuario desactivado",
                    description: "Tu cuenta ha sido desactivada. Contacta al administrador para más información.",
                    variant: "destructive",
                  });
                  return;
                }
              } catch (profileError) {
                console.error("Error verificando estado del usuario:", profileError);
                cleanupAuthState();
                setSession(null);
                setUser(null);
                
                toast({
                  title: "Error de verificación",
                  description: "No se pudo verificar el estado de tu cuenta",
                  variant: "destructive",
                });
              }
            }, 0);
          } else {
            setSession(null);
            setUser(null);
          }

          // Solo mostrar toast de "Sesión iniciada" si no es la carga inicial 
          // y si es un evento explícito de SIGNED_IN (no un refresh de token)
          if (event === "SIGNED_IN" && !isInitialLoad && currentSession?.user) {
            // Invalidar queries de reservas para refrescar datos
            queryClient.invalidateQueries({ queryKey: ["booking-rules"] });
            queryClient.invalidateQueries({ queryKey: ["available-court-types"] });
            queryClient.invalidateQueries({ queryKey: ["court-type-settings-all"] });
            queryClient.invalidateQueries({ queryKey: ["active-bookings-count"] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            queryClient.invalidateQueries({ queryKey: ["special-bookings"] });
            queryClient.invalidateQueries({ queryKey: ["all-bookings"] });
            queryClient.invalidateQueries({ queryKey: ["userBookings"] });
            
            toast({
              title: "Sesión iniciada",
              description: "Has iniciado sesión exitosamente",
            });
          } else if (event === "SIGNED_OUT") {
            toast({
              title: "Sesión cerrada",
              description: "Has cerrado sesión exitosamente",
            });
          }
        });

        // THEN check for existing session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession?.user) {
          // Establecer sesión inmediatamente
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Diferir verificación para evitar bloqueos
          setTimeout(async () => {
            try {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('is_active, full_name')
                .eq('id', initialSession.user.id)
                .single();

              if (error || !profile?.is_active) {
                console.log("Usuario inactivo en sesión inicial, cerrando sesión");
                cleanupAuthState();
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                
                if (!profile?.is_active) {
                  toast({
                    title: "Usuario desactivado",
                    description: "Tu cuenta ha sido desactivada. Contacta al administrador para más información.",
                    variant: "destructive",
                  });
                }
              }
            } catch (profileError) {
              console.error("Error verificando estado inicial del usuario:", profileError);
              cleanupAuthState();
              setSession(null);
              setUser(null);
            }
          }, 0);
        }
        
        setLoading(false);
        setIsInitialLoad(false); // Marcar que la carga inicial ha terminado
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error initializing auth:", error);
        setLoading(false);
      }
    };

    const cleanup = initializeAuth();
    
    return () => {
      cleanup.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, [toast]);

  // Invalidate critical queries whenever user session becomes available
  useEffect(() => {
    if (user?.id) {
      // Force-refresh booking related data after login across all screens
      queryClient.invalidateQueries({ queryKey: ["booking-rules"] });
      queryClient.invalidateQueries({ queryKey: ["available-court-types"] });
      queryClient.invalidateQueries({ queryKey: ["court-type-settings-all"] });
      queryClient.invalidateQueries({ queryKey: ["court-type-settings"] });
      queryClient.invalidateQueries({ queryKey: ["active-bookings-count"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["special-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["all-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["userBookings"] });
    }
  }, [user?.id, queryClient]);

  // Función para limpiar el estado de autenticación
  const cleanupAuthState = () => {
    // Limpiar todas las claves de autenticación de localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Limpiar sessionStorage si está en uso
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  };

  const signOut = async () => {
    try {
      setIsSigningOut(true);
      
      // Mostrar toast inmediatamente para feedback del usuario
      toast({
        title: "Cerrando sesión...",
        description: "Por favor espera un momento",
      });
      
      // Limpiar el estado primero
      cleanupAuthState();
      
      // Intentar cerrar sesión global (ignora errores)
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log("Error en signOut global, continuando con limpieza local:", err);
      }
      
      // Limpiar estado local inmediatamente
      setSession(null);
      setUser(null);
      
      // Delay mínimo para mostrar el toast de feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navegación suave sin recarga completa
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      
    } catch (error) {
      console.error("Error durante signOut:", error);
      
      // Aún así limpiar el estado local
      cleanupAuthState();
      setSession(null);
      setUser(null);
      
      toast({
        title: "Sesión cerrada",
        description: "La sesión se ha cerrado correctamente",
        variant: "default",
      });
      
      // Navegación de respaldo
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <AuthContext.Provider value={{ session, user, loading, isSigningOut, signOut }}>
        {children}
      </AuthContext.Provider>
      <Toaster />
    </>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
