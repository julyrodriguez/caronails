// src/components/Toast.tsx
import React, { useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";

export type ToastMessage = {
  type: "ok" | "warn" | "err";
  title: string;
  message?: string;
};

type Props = {
  flash: ToastMessage | null;
  onClose: () => void;
};

export default function Toast({ flash, onClose }: Props) {
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [flash, onClose]);

  if (!flash) return null;

  const config = {
    ok: {
      bg: "bg-[#EBF8F2]",
      border: "border-[#A7F3D0]",
      text: "text-[#4E9B78]",
      icon: CheckCircle2,
    },
    warn: {
      bg: "bg-[#FFFBEB]",
      border: "border-[#FDE68A]",
      text: "text-[#DFA559]",
      icon: AlertTriangle,
    },
    err: {
      bg: "bg-[#FEF2F2]",
      border: "border-[#FCA5A5]",
      text: "text-[#DC2626]",
      icon: XCircle,
    },
  }[flash.type];

  const Icon = config.icon;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto animate-slide-down">
      <div
        className={`${config.bg} ${config.border} border rounded-2xl p-4 shadow-lg flex items-start justify-between gap-3`}
      >
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${config.text} shrink-0 mt-0.5`} />
          <div>
            <h4 className={`text-sm font-bold ${config.text}`}>{flash.title}</h4>
            {flash.message && (
              <p className="text-xs text-[#2E1E2F] font-medium mt-0.5">
                {flash.message}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[#826F84] hover:text-[#2E1E2F] p-1 rounded-lg hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
