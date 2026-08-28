// src/components/Modal.tsx
import React, { useEffect } from "react";
import { X } from "lucide-react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#2E1E2F]/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog container */}
      <div
        className={`relative w-full ${maxWidth} bg-white/95 backdrop-blur-md rounded-3xl border border-[#EED7E2] subtle-shadow p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto transform transition-all animate-scale-up`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#EED7E2]/50 mb-4">
          {title ? (
            <h3 className="text-lg font-bold text-[#2E1E2F]">{title}</h3>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#826F84] hover:text-[#2E1E2F] bg-[#FAF5F8] hover:bg-[#FBF0F4] border border-[#EED7E2] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
