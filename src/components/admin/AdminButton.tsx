import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";
import type { VariantProps } from "class-variance-authority";

interface AdminButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof Button> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link" | "secondary";
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function AdminButton({
  children,
  className,
  variant = "default",
  size = "default",
  icon,
  fullWidth = false,
  ...props
}: AdminButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        // Base styles
        "font-medium transition-all duration-200 active:scale-95",
        // Variant-specific hover effects
        variant === "destructive" && "hover:bg-red-600",
        variant === "outline" && "hover:bg-accent hover:text-accent-foreground",
        variant === "default" && "hover:bg-primary/90",
        // Full width option
        fullWidth && "w-full",
        // Icon styles
        icon && "inline-flex items-center gap-2",
        // Custom className
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </Button>
  );
}