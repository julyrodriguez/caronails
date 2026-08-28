// src/pages/ClientsPage.tsx
import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  Search,
  Plus,
  UserCheck,
  ChevronRight,
  Sparkles,
  DollarSign,
  AlertCircle,
  Users,
} from "lucide-react";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import Modal from "../components/Modal";
import Toast, { ToastMessage } from "../components/Toast";
import { useClientsSearch, createClientDirect } from "../hooks/useClients";
import { useClientAppointments } from "../hooks/useClientAppointments";
import { useAccount } from "../hooks/useAccount";
import { fmtMoney } from "../lib/normalize";

function ClientCard({
  client,
  onClick,
}: {
  client: any;
  onClick: () => void;
}) {
  const { items: appointments } = useClientAppointments(client.id);

  const totalTurns = appointments.length;
  const paidTurns = appointments.filter((a) => a.paid && !a.canceled).length;
  const pendingTurns = appointments.filter((a) => !a.paid && !a.canceled).length;
  const totalSpent = appointments
    .filter((a) => a.paid && !a.canceled)
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl p-4 border border-[#EED7E2] subtle-shadow hover:border-[#D48C9E]/50 transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
    >
      <div className="flex-1 truncate">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-[#FBF0F4] text-[#D48C9E] flex items-center justify-center font-bold text-xs shrink-0 border border-[#EED7E2]">
            {client.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="truncate">
            <h4 className="font-extrabold text-sm text-[#2E1E2F] truncate">
              {client.name}
            </h4>
            {client.phone && (
              <p className="text-[11px] text-[#826F84] font-medium leading-none mt-0.5">
                {client.phone}
              </p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pl-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FBF0F4] text-[#D48C9E] border border-[#EED7E2]">
            💅 {totalTurns} {totalTurns === 1 ? "Turno" : "Turnos"}
          </span>

          {pendingTurns > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFFBEB] text-[#DFA559] border border-[#FDE68A]">
              ⏳ {pendingTurns} impago{pendingTurns === 1 ? "" : "s"}
            </span>
          )}

          {totalSpent > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EBF8F2] text-[#4E9B78] border border-[#A7F3D0]">
              💵 ${fmtMoney(totalSpent)}
            </span>
          )}
        </div>
      </div>

      <div className="w-8 h-8 rounded-xl bg-[#FAF5F8] flex items-center justify-center text-[#826F84] shrink-0 border border-[#EED7E2]">
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [, setLocation] = useLocation();
  const { accountId } = useAccount();

  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { items: clients, loading } = useClientsSearch(query);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newClientName.trim() || !accountId) return;

    try {
      setIsCreating(true);
      const newId = await createClientDirect(
        accountId,
        newClientName.trim(),
        newClientPhone.trim()
      );
      setIsModalOpen(false);
      setNewClientName("");
      setNewClientPhone("");
      setToast({
        type: "ok",
        title: "¡Clienta Creada!",
        message: `Se registró a ${newClientName} exitosamente.`,
      });
      setLocation(`/clients/${newId}`);
    } catch (err: any) {
      setToast({
        type: "err",
        title: "Error",
        message: err.message,
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF5F8] pb-24">
      <AppHeader title="Clientas" subtitle="Directorio y fichas de clientas" />
      <Toast flash={toast} onClose={() => setToast(null)} />

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Search and Add Top Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#826F84]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar clienta por nombre..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#EED7E2] text-[#2E1E2F] placeholder-[#826F84] font-semibold text-sm focus:outline-none focus:border-[#D48C9E] focus:ring-2 focus:ring-[#D48C9E]/20"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-3 rounded-2xl bg-[#D48C9E] text-white font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#B96B80] active:scale-95 transition-all shadow-md shadow-[#D48C9E]/25 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Clienta</span>
          </button>
        </div>

        {/* Clients List */}
        <div className="space-y-2.5">
          {clients.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-[#EED7E2] subtle-shadow space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FBF0F4] text-[#D48C9E] flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#2E1E2F]">
                  {query ? "No se encontraron clientas" : "Aún no hay clientas registradas"}
                </h4>
                <p className="text-xs text-[#826F84] font-medium mt-1 max-w-xs mx-auto">
                  {query
                    ? "Podés crear una nueva clienta con ese nombre tocando el botón de arriba."
                    : "Creá tu primera clienta para agendar turnos rápidamente."}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#D48C9E] text-white text-xs font-extrabold hover:bg-[#B96B80] active:scale-95 transition-all shadow-md shadow-[#D48C9E]/20"
              >
                + Crear Clienta
              </button>
            </div>
          ) : (
            clients.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                onClick={() => setLocation(`/clients/${c.id}`)}
              />
            ))
          )}
        </div>
      </main>

      {/* New Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Clienta"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              autoFocus
              required
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Ej: Carolina Herrera"
              className="w-full px-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-bold text-sm focus:outline-none focus:border-[#D48C9E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Teléfono / WhatsApp (Opcional)
            </label>
            <input
              type="tel"
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              placeholder="Ej: +54 9 11 1234-5678"
              className="w-full px-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-medium text-sm focus:outline-none focus:border-[#D48C9E]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isCreating || !newClientName.trim()}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#D48C9E] text-white font-extrabold text-sm hover:bg-[#B96B80] active:scale-95 transition-all shadow-md shadow-[#D48C9E]/25 disabled:opacity-60"
            >
              {isCreating ? "Guardando..." : "Guardar Clienta ✨"}
            </button>
          </div>
        </form>
      </Modal>

      <BottomNav />
    </div>
  );
}
