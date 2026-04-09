import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  overrides?: unknown;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", overrides: _overrides, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={`w-full px-3 py-0 min-h-[32px] max-h-[32px] text-sm font-medium border border-[#D1D5DB] rounded-lg bg-white text-[#111827] focus:outline-none focus:border-[#111827] focus:ring-[#111827]/20 focus:ring-2 placeholder:text-[#9CA3AF] disabled:bg-[#F3F4F6] disabled:cursor-not-allowed ${className}`.trim()}
      {...props}
    />
  );
});
