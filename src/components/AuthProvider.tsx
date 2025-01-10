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
    // Initialize auth state from any existing session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth event:", event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        switch (event) {
          case 'SIGNED_IN':
            toast({
              title: "Sesión iniciada",
              description: "Has iniciado sesión exitosamente",
            });
            break;
          case 'SIGNED_OUT':
            toast({
              title: "Sesión cerrada",
              description: "Has cerrado sesión exitosamente",
            });
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const signOut = async () => {
    try {
      setLoading(true);
      
      // First, remove the session from localStorage
      localStorage.removeItem('supabase.auth.token');
      
      // Clear the auth state immediately
      setSession(null);
      setUser(null);

      // Then attempt to sign out from Supabase
      await supabase.auth.signOut().catch((error) => {
        console.warn("Non-critical error during sign out:", error);
        // We don't throw here as we've already cleared the local state
      });

    } catch (error) {
      console.error("Error in signOut:", error);
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