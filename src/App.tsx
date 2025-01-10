import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import Index from "./pages/Index";
import AdminIndex from "./pages/admin/Index";
import Login from "./pages/auth/Login";
import { useGlobalRole } from "@/hooks/use-global-role";
import { useToast } from "@/hooks/use-toast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AdminRoute() {
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useGlobalRole(user?.id);
  const { toast } = useToast();
  const location = useLocation();

  console.log("AdminRoute - User:", user);
  console.log("AdminRoute - UserRole:", userRole);
  console.log("AdminRoute - Loading states:", { authLoading, roleLoading });

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Verificando permisos...</div>
      </div>
    );
  }

  if (!user) {
    console.log("AdminRoute - No user, redirecting to login");
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (userRole?.role !== "admin") {
    console.log("AdminRoute - User is not admin");
    toast({
      title: "Acceso denegado",
      description: "No tienes permisos para acceder al panel de control",
      variant: "destructive",
    });
    return <Navigate to="/" replace />;
  }

  console.log("AdminRoute - Rendering admin panel");
  return <AdminIndex />;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log("RequireAuth - User:", user);
  console.log("RequireAuth - Loading:", loading);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    console.log("RequireAuth - No user, redirecting to login");
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename="/">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/*" element={<AdminRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;