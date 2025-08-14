
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import Index from "./pages/Index";
import AdminIndex from "./pages/admin/Index";
import OperatorIndex from "./pages/operator/Index";
import Login from "./pages/auth/Login";
import Courses from "./pages/Courses";
import Display from "./pages/Display";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
      experimental_prefetchInRender: false,
    },
  },
});

function AdminRoute() {
  return <AdminIndex />;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

const AppContent = () => {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/operator" element={<OperatorIndex />} />
        <Route path="/display" element={<Display />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
