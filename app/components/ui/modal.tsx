import type { ReactNode } from "react";

export const SIZE = {
  default: "default",
  large: "large",
} as const;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: (typeof SIZE)[keyof typeof SIZE];
  children: ReactNode;
  overrides?: unknown;
}

export function Modal({
  isOpen,
  onClose,
  size = SIZE.default,
  children,
  overrides: _overrides,
}: ModalProps) {
  if (!isOpen) return null;

  const widthClass = size === SIZE.large ? "max-w-4xl" : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close modal backdrop"
      />
      <div className={`relative w-full ${widthClass} rounded-lg bg-white shadow-lg`}>
        {children}
      </div>
    </div>
  );
}
