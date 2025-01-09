import { createContext, useContext, useEffect, useState } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
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
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          toast({
            title: "Error",
            description: "Error al inicializar la sesión",
            variant: "destructive",
          });
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("Auth event:", event);
          if (event === 'SIGNED_IN') {
            setSession(session);
            setUser(session?.user ?? null);
            toast({
              title: "Sesión iniciada",
              description: "Has iniciado sesión exitosamente",
            });
          } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            toast({
              title: "Sesión cerrada",
              description: "Has cerrado sesión exitosamente",
            });
          } else if (event === 'USER_UPDATED') {
            setSession(session);
            setUser(session?.user ?? null);
          }
          setLoading(false);
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error initializing auth:", error);
        setLoading(false);
        toast({
          title: "Error",
          description: "Error al inicializar la autenticación",
          variant: "destructive",
        });
      }
    };

    initializeAuth();
  }, [toast]);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error signing out:", error);
        toast({
          title: "Error",
          description: "Hubo un problema al cerrar sesión",
          variant: "destructive",
        });
        return;
      }

      setSession(null);
      setUser(null);
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
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