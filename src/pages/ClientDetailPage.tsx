// src/pages/ClientDetailPage.tsx
import React, { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Trash2,
  CalendarPlus,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import confetti from "canvas-confetti";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import Toast, { ToastMessage } from "../components/Toast";
import { db } from "../lib/firebase";
import { useAccount } from "../hooks/useAccount";
import { useClientAppointments } from "../hooks/useClientAppointments";
import { deleteClientCascade } from "../hooks/useClients";
import { updateAppointment } from "../hooks/useAppointments";
import { fmtMoney, fmtDate, fmtTime } from "../lib/normalize";

export default function ClientDetailPage() {
  const [, params] = useRoute("/clients/:clientId");
  const [, setLocation] = useLocation();
  const { accountId } = useAccount();

  const clientId = params?.clientId || "";
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const { items: appointments } = useClientAppointments(clientId);

  // Fetch client details
  useEffect(() => {
    if (!clientId || !accountId) return;
    const ref = doc(db, "accounts", accountId, "clients", clientId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setClient({ id: snap.id, ...snap.data() });
      } else {
        setClient(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [clientId, accountId]);

  // Metrics
  const totalTurns = appointments.length;
  const paidTurns = appointments.filter((a) => a.paid && !a.canceled).length;
  const pendingTurns = appointments.filter((a) => !a.paid && !a.canceled).length;
  const totalSpent = appointments
    .filter((a) => a.paid && !a.canceled)
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const pendingDebt = appointments
    .filter((a) => !a.paid && !a.canceled)
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  // Toggle paid on specific appointment
  async function handleTogglePaid(appt: any) {
    if (!accountId) return;
    const newPaidStatus = !appt.paid;
    try {
      await updateAppointment(accountId, appt.id, { paid: newPaidStatus });
      if (newPaidStatus) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#D48C9E", "#4E9B78", "#FFD700"],
        });
        setToast({
          type: "ok",
          title: "¡Turno Cobrado!",
          message: "Se actualizó el estado de pago.",
        });
      }
    } catch (err: any) {
      setToast({
        type: "err",
        title: "Error",
        message: err.message,
      });
    }
  }

  // Delete client cascade
  async function handleDeleteClient() {
    if (!accountId || !clientId) return;
    const confirmed = window.confirm(
      `¿Estás segura de eliminar a "${client?.name}"?\n\n⚠️ Esta acción eliminará permanentemente la clienta y todos sus turnos históricos.`
    );
    if (!confirmed) return;

    try {
      await deleteClientCascade(accountId, clientId);
      setLocation("/clients");
    } catch (err: any) {
      setToast({
        type: "err",
        title: "Error al eliminar",
        message: err.message,
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF5F8] pb-24">
      <AppHeader subtitle="Ficha de Clienta" />
      <Toast flash={toast} onClose={() => setToast(null)} />

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Back and Top Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setLocation("/clients")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EED7E2] text-xs font-extrabold text-[#826F84] hover:text-[#2E1E2F] hover:bg-[#FBF0F4] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Clientas</span>
          </button>

          <button
            onClick={handleDeleteClient}
            className="p-2 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] hover:bg-red-100 transition-colors"
            title="Eliminar clienta"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Client Profile Card */}
        {client ? (
          <div className="glass-card rounded-3xl p-5 sm:p-6 subtle-shadow border border-[#EED7E2] space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#D48C9E] to-[#EAA8B8] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-[#D48C9E]/25">
                {client.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 truncate">
                <h2 className="text-xl font-black text-[#2E1E2F] tracking-tight truncate">
                  {client.name}
                </h2>
                {client.phone ? (
                  <a
                    href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4E9B78] hover:underline mt-0.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{client.phone}</span>
                  </a>
                ) : (
                  <p className="text-xs text-[#826F84] font-medium mt-0.5">
                    Sin teléfono registrado
                  </p>
                )}
              </div>
            </div>

            {/* Metrics Summary Strip */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EED7E2]/60 text-center">
              <div className="p-2.5 rounded-2xl bg-[#FBF0F4] border border-[#EED7E2]">
                <div className="text-sm font-black text-[#D48C9E]">{totalTurns}</div>
                <div className="text-[10px] font-bold text-[#826F84] uppercase mt-0.5">
                  Turnos
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#EBF8F2] border border-[#A7F3D0]">
                <div className="text-sm font-black text-[#4E9B78]">
                  ${fmtMoney(totalSpent)}
                </div>
                <div className="text-[10px] font-bold text-[#4E9B78] uppercase mt-0.5">
                  Invertido
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]">
                <div className="text-sm font-black text-[#DFA559]">
                  ${fmtMoney(pendingDebt)}
                </div>
                <div className="text-[10px] font-bold text-[#DFA559] uppercase mt-0.5">
                  Pendiente
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#EED7E2]">
            <p className="text-xs font-bold text-[#826F84]">
              {loading ? "Cargando datos..." : "Clienta no encontrada"}
            </p>
          </div>
        )}

        {/* Historial de Turnos */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#826F84]">
              Historial de Turnos ({appointments.length})
            </h3>
          </div>

          <div className="space-y-2">
            {appointments.length === 0 ? (
              <div className="bg-white rounded-3xl p-6 text-center border border-[#EED7E2] text-xs font-medium text-[#826F84]">
                Esta clienta aún no tiene turnos registrados.
              </div>
            ) : (
              appointments.map((appt) => {
                const apptDate = appt.startAt?.toDate
                  ? appt.startAt.toDate()
                  : new Date(appt.startAt?.seconds * 1000 || 0);

                return (
                  <div
                    key={appt.id}
                    className="bg-white rounded-3xl p-4 border border-[#EED7E2] subtle-shadow flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-11 h-11 rounded-2xl bg-[#FBF0F4] border border-[#EED7E2] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-[#826F84] uppercase leading-none">
                          {apptDate.toLocaleDateString("es-AR", { month: "short" })}
                        </span>
                        <span className="text-sm font-black text-[#2E1E2F] leading-none mt-0.5">
                          {apptDate.getDate()}
                        </span>
                      </div>

                      <div className="truncate">
                        <h4 className="font-extrabold text-sm text-[#2E1E2F] truncate">
                          {appt.description || "Servicio de Manicuría"}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-[#826F84] font-semibold mt-0.5">
                          <span>{fmtTime(apptDate)} hs</span>
                          <span>•</span>
                          <span className="text-[#D48C9E] font-black">
                            ${fmtMoney(appt.amount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTogglePaid(appt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 ${
                        appt.paid
                          ? "bg-[#EBF8F2] text-[#4E9B78] border border-[#A7F3D0]"
                          : "bg-[#FFFBEB] text-[#DFA559] border border-[#FDE68A]"
                      }`}
                    >
                      {appt.paid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pagó</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Pendiente</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
