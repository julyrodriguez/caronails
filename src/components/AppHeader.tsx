// src/components/AppHeader.tsx
import React from "react";
import { signOut } from "firebase/auth";
import { useLocation } from "wouter";
import { LogOut, GraduationCap, Sparkles } from "lucide-react";
import { auth } from "../lib/firebase";

type Props = {
  title?: string;
  subtitle?: string;
  showLogout?: boolean;
  hideSettings?: boolean;
};

export default function AppHeader({
  title = "Caro Nails",
  subtitle,
  showLogout = true,
  hideSettings = false,
}: Props) {
  const [, setLocation] = useLocation();

  async function onLogout() {
    await signOut(auth);
    setLocation("/login");
  }

  function goToFaculty() {
    setLocation("/faculty");
  }

  return (
    <header className="sticky top-0 z-30 w-full glass-header px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#EED7E2]/70 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#D48C9E] to-[#E8A5B5] flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#D48C9E]/25">
          CN
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#2E1E2F]">
              {title}
            </h1>
            {title === "Caro Nails" && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FBF0F4] text-[#D48C9E] border border-[#EED7E2]">
                Studio ✨
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[#826F84] font-medium leading-none mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {showLogout && (
        <div className="flex items-center gap-2">
          {!hideSettings && (
            <button
              onClick={goToFaculty}
              title="Horarios de Facultad"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FBF0F4] text-[#7D6B90] border border-[#EED7E2] hover:bg-[#F3EEF7] active:scale-95 transition-all"
            >
              <GraduationCap className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onLogout}
            title="Cerrar Sesión"
            className="h-9 px-3.5 rounded-xl flex items-center gap-1.5 bg-[#FAF5F8] text-[#826F84] border border-[#EED7E2] hover:text-[#2E1E2F] hover:bg-white active:scale-95 transition-all text-xs font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      )}
    </header>
  );
}
