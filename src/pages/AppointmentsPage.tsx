// src/pages/AppointmentsPage.tsx
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  CalendarPlus,
} from "lucide-react";
import confetti from "canvas-confetti";
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import ClientPicker from "../components/ClientPicker";
import Toast, { ToastMessage } from "../components/Toast";
import { db } from "../lib/firebase";
import { useAccount } from "../hooks/useAccount";
import { dayKeyFromDate, monthKeyFromDate } from "../lib/keys";
import { fmtDate, fmtTime } from "../lib/normalize";

function formatYMD(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatTimeHM(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseYMD(s: string): Date | null {
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const yy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd)
    return null;
  return d;
}

export default function AppointmentsPage() {
  const [, setLocation] = useLocation();
  const { accountId } = useAccount();

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [client, setClient] = useState<{
    clientId: string;
    clientName: string;
  } | null>(null);

  const [dateStr, setDateStr] = useState(() => formatYMD(new Date()));
  const [timeStr, setTimeStr] = useState("14:00");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paid, setPaid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Listen to URL search param if date was passed ?date=YYYY-MM-DD
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paramDate = searchParams.get("date");
    if (paramDate && parseYMD(paramDate)) {
      setDateStr(paramDate);
    }
  }, []);

  const quickHours = [
    "10:00",
    "11:00",
    "12:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
  ];

  function applyQuickDate(daysAdd: number) {
    const base = new Date();
    base.setDate(base.getDate() + daysAdd);
    setDateStr(formatYMD(base));
  }

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;

    if (!client) {
      setToast({
        type: "warn",
        title: "Falta clienta",
        message: "Por favor selecciona o crea una clienta para el turno.",
      });
      return;
    }

    if (!accountId) {
      setToast({
        type: "err",
        title: "Error",
        message: "No se encontró la cuenta de usuario.",
      });
      return;
    }

    const parsedDate = parseYMD(dateStr);
    if (!parsedDate) {
      setToast({
        type: "warn",
        title: "Fecha inválida",
        message: "Por favor introduce una fecha válida.",
      });
      return;
    }

    if (parsedDate.getDay() === 0) {
      setToast({
        type: "warn",
        title: "Domingo cerrado",
        message: "No se pueden agendar turnos los días domingo.",
      });
      return;
    }

    const [hh, mm] = timeStr.split(":").map(Number);
    const startDateTime = new Date(parsedDate);
    startDateTime.setHours(isNaN(hh) ? 14 : hh, isNaN(mm) ? 0 : mm, 0, 0);

    try {
      setIsSaving(true);

      const ref = collection(db, "accounts", accountId, "appointments");
      const startTs = Timestamp.fromDate(startDateTime);

      // Check double booking
      const qCheck = query(ref, where("startAt", "==", startTs), limit(1));
      const snap = await getDocs(qCheck);

      if (!snap.empty) {
        setToast({
          type: "warn",
          title: "Horario ocupado",
          message: `Ya existe un turno el ${fmtDate(startDateTime)} a las ${fmtTime(startDateTime)}.`,
        });
        setIsSaving(false);
        return;
      }

      await addDoc(ref, {
        clientId: client.clientId,
        clientNameSnapshot: client.clientName,
        startAt: startTs,
        amount: amount ? Number(amount) : 0,
        description: description.trim() || "Servicio de Manicuría",
        paid,
        dayKey: dayKeyFromDate(startDateTime),
        monthKey: monthKeyFromDate(startDateTime),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#D48C9E", "#4E9B78", "#FFD700"],
      });

      setToast({
        type: "ok",
        title: "¡Turno Agendado!",
        message: `Turno de ${client.clientName} agendado para el ${fmtDate(startDateTime)} a las ${fmtTime(startDateTime)}.`,
      });

      // Reset form
      setClient(null);
      setAmount("");
      setDescription("");
      setPaid(false);
    } catch (err: any) {
      setToast({
        type: "err",
        title: "Error al agendar",
        message: err.message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF5F8] pb-24">
      <AppHeader title="Nuevo Turno" subtitle="Agendar cita para clienta" />
      <Toast flash={toast} onClose={() => setToast(null)} />

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-4">
        <form
          onSubmit={handleCreateAppointment}
          className="glass-card rounded-3xl p-5 sm:p-7 subtle-shadow border border-[#EED7E2] space-y-5"
        >
          {/* Client Selection */}
          <ClientPicker value={client} onChange={setClient} />

          {/* Date Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Fecha del Turno
            </label>
            <div className="relative">
              <CalendarIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D48C9E]" />
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-bold text-sm focus:outline-none focus:border-[#D48C9E] focus:ring-2 focus:ring-[#D48C9E]/20"
              />
            </div>

            {/* Quick date chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: "Hoy", add: 0 },
                { label: "Mañana", add: 1 },
                { label: "+2 Días", add: 2 },
                { label: "+1 Sem", add: 7 },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => applyQuickDate(chip.add)}
                  className="px-2.5 py-1 rounded-xl bg-[#FAF5F8] border border-[#EED7E2] text-[11px] font-extrabold text-[#826F84] hover:text-[#2E1E2F] hover:bg-[#FBF0F4] active:scale-95 transition-all"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Horario
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D48C9E]" />
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-bold text-sm focus:outline-none focus:border-[#D48C9E] focus:ring-2 focus:ring-[#D48C9E]/20"
              />
            </div>

            {/* Quick hours */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickHours.map((qh) => (
                <button
                  key={qh}
                  type="button"
                  onClick={() => setTimeStr(qh)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition-all ${
                    timeStr === qh
                      ? "bg-[#D48C9E] text-white shadow-xs"
                      : "bg-[#FAF5F8] border border-[#EED7E2] text-[#826F84] hover:text-[#2E1E2F]"
                  }`}
                >
                  {qh}
                </button>
              ))}
            </div>
          </div>

          {/* Amount and Payment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
                Monto ($)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D48C9E]" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej: 18000"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-extrabold text-sm focus:outline-none focus:border-[#D48C9E] focus:ring-2 focus:ring-[#D48C9E]/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
                Estado de Pago
              </label>
              <button
                type="button"
                onClick={() => setPaid(!paid)}
                className={`w-full py-3 px-4 rounded-2xl border flex items-center justify-between text-xs font-extrabold transition-all ${
                  paid
                    ? "bg-[#EBF8F2] border-[#A7F3D0] text-[#4E9B78]"
                    : "bg-[#FFFBEB] border-[#FDE68A] text-[#DFA559]"
                }`}
              >
                <span>{paid ? "Pagado ✅" : "Pendiente de cobro ⏳"}</span>
                <span className="text-[10px] underline">Tocar para cambiar</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Servicio / Notas
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3.5 top-3.5 text-[#826F84]" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Ej: Kapping gel con francesita y decoración..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-medium text-sm focus:outline-none focus:border-[#D48C9E] focus:ring-2 focus:ring-[#D48C9E]/20 resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#D48C9E] to-[#C57488] text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-[#D48C9E]/25 disabled:opacity-60 mt-4"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Agendando turno...</span>
              </>
            ) : (
              <>
                <CalendarPlus className="w-4 h-4" />
                <span>Confirmar y Agendar Turno</span>
              </>
            )}
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
