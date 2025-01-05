import { useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import MainNav from "@/components/MainNav";

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}