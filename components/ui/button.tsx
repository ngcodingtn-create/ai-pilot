import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "success";
type ButtonSize = "default" | "sm" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "border-sky-300 bg-sky-600 text-white hover:border-sky-400 hover:bg-sky-700",
  secondary:
    "border-slate-300 bg-slate-900 text-white hover:border-slate-700 hover:bg-slate-800",
  outline:
    "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50",
  ghost:
    "border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100",
  success:
    "border-emerald-300 bg-emerald-600 text-white hover:border-emerald-400 hover:bg-emerald-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 py-2 text-sm",
  lg: "h-11 px-5 py-2.5",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl border text-sm font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
