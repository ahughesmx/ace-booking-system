
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

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

  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error during signOut:", error);
        toast({
          title: "Error",
          description: "Hubo un problema al cerrar sesión",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthContext.Provider value={{ session, user, loading, signOut }}>
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
