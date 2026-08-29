// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useLocation } from "wouter";
import { User, Lock, Eye, EyeOff, Sparkles, Loader2 } from "lucide-react";
import { auth } from "../lib/firebase";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const email = `${(user || "").trim().toLowerCase()}@equipo.local`;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (user.trim().toLowerCase() !== "caro") {
      setError("Usuario no autorizado");
      return;
    }

    if (!pass.trim()) {
      setError("Por favor ingresa tu contraseña");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
      setLocation("/calendar");
    } catch (err: any) {
      setError("Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-[#FAF5F8] via-[#F6ECF2] to-[#FAF5F8]">
      {/* Decorative ambient blurred orbs */}
      <div className="absolute top-1/6 left-1/8 w-72 h-72 bg-[#D48C9E]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/6 right-1/8 w-80 h-80 bg-[#7D6B90]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-52 h-52 bg-[#EED7E2]/50 rounded-full blur-2xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-sm glass-card rounded-3xl p-7 sm:p-8 subtle-shadow border border-[#EED7E2]/80 z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img
            src="/iconCaro.jpeg"
            alt="Caro Nails Logo"
            className="w-16 h-16 rounded-3xl mx-auto mb-4 object-cover border border-[#EED7E2] shadow-xl shadow-[#D48C9E]/25"
          />
          <h1 className="text-2xl font-black tracking-tight text-[#2E1E2F]">
            Caro Nails
          </h1>
          <p className="text-xs text-[#826F84] font-medium mt-1">
            Studio de Belleza & Cuidado Profesional
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* User input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Usuario
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D48C9E]" />
              <input
                type="text"
                value={user}
                onChange={(e) => {
                  setUser(e.target.value);
                  setError("");
                }}
                placeholder="Introduce tu usuario..."
                autoCapitalize="none"
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] placeholder-[#826F84]/70 font-semibold text-sm focus:outline-none focus:border-[#D48C9E] focus:ring-2 focus:ring-[#D48C9E]/20 transition-all"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D48C9E]" />
              <input
                type={showPassword ? "text" : "password"}
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
                disabled={loading}
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] placeholder-[#826F84]/70 font-semibold text-sm focus:outline-none focus:border-[#D48C9E] focus:ring-2 focus:ring-[#D48C9E]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#826F84] hover:text-[#2E1E2F] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs font-bold text-center animate-shake">
              ⚠️ {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D48C9E] to-[#C57488] text-white font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-[#D48C9E]/25 disabled:opacity-70 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando acceso...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Entrar a mi Agenda</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
