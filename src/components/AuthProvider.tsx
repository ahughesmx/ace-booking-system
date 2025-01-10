import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Función para actualizar el estado de autenticación
    const updateAuthState = (newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    };

    // Inicializar el estado de autenticación
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session);
    });

    // Suscribirse a cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);
      updateAuthState(session);

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

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const signOut = async () => {
    try {
      setLoading(true);

      // 1. Limpiar el storage local primero
      const keys = ['supabase.auth.token', 'supabase.auth.refreshToken'];
      keys.forEach(key => localStorage.removeItem(key));

      // 2. Limpiar el estado local
      setSession(null);
      setUser(null);

      // 3. Intentar cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("Error en signOut de Supabase:", error);
        // No lanzamos el error ya que el estado local ya está limpio
      }

    } catch (error) {
      console.error("Error en signOut:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al cerrar sesión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};