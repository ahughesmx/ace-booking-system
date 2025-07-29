
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useNavigate } from "react-router-dom";

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
  const { toast } = useToast();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          console.log("Auth event:", event);
          
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
          } else {
            setSession(null);
            setUser(null);
          }

          if (event === "SIGNED_IN") {
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
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
        }
        
        setLoading(false);
        
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
