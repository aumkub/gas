import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonKind =
  | "primary"
  | "negative"
  | "tertiary"
  | "secondary"
  | "ghost"
  | "destructive";
type ButtonSize = "compact" | "default" | "large" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  kind?: ButtonKind;
  size?: ButtonSize;
  isLoading?: boolean;
  overrides?: unknown;
}

const baseClass =
  "inline-flex items-center justify-center font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-lg !h-6 !min-h-[36px] !text-sm";

const kindClass: Record<ButtonKind, string> = {
  primary: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] border-0",
  negative: "bg-[#DC2626] text-white hover:bg-[#B91C1C] border-0",
  tertiary: "bg-[#F3F4F6] text-[#111827] hover:bg-[#E5E7EB] border-0",
  secondary: "bg-transparent text-[#111827] border border-[#111827] hover:bg-[#1118270A]",
  ghost: "bg-transparent text-[#4B5563] hover:bg-[#F3F4F6] border-0",
  destructive: "bg-[#DC2626] text-white hover:bg-[#B91C1C] border-0",
};

const sizeClass: Record<ButtonSize, string> = {
  compact: "h-8 px-3 text-sm",
  default: "h-12 px-4 text-base",
  large: "h-14 px-6 text-lg",
  sm: "h-8 px-3 text-sm",
  md: "h-12 px-4 text-base",
  lg: "h-14 px-6 text-lg",
};

export function Button({
  children,
  kind = "primary",
  size = "default",
  isLoading = false,
  className = "",
  disabled,
  overrides: _overrides,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseClass} ${kindClass[kind]} ${sizeClass[size]} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
}
