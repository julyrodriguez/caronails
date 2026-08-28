// src/components/ClientPicker.tsx
import React, { useState } from "react";
import { Search, UserCheck, Plus, Check } from "lucide-react";
import { useClientsSearch, Client } from "../hooks/useClients";
import { useAccount } from "../hooks/useAccount";
import { normalizeText } from "../lib/normalize";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Modal from "./Modal";

type Props = {
  value: { clientId: string; clientName: string } | null;
  onChange: (v: { clientId: string; clientName: string }) => void;
};

export default function ClientPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { items } = useClientsSearch(query);
  const { accountId } = useAccount();

  const canCreate = normalizeText(query).length >= 2;

  async function handleCreateClient() {
    if (!canCreate || !accountId) return;
    try {
      const name = query.trim();
      const ref = collection(db, "accounts", accountId, "clients");
      const docRef = await addDoc(ref, {
        name,
        nameLower: normalizeText(name),
        createdAt: serverTimestamp(),
      });

      onChange({ clientId: docRef.id, clientName: name });
      setOpen(false);
      setQuery("");
    } catch (e: any) {
      alert("Error al crear clienta: " + (e?.message || ""));
    }
  }

  return (
    <div className="w-full space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
        Clienta
      </label>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full px-4 py-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 active:scale-[0.99] ${
          value
            ? "bg-[#FBF0F4] border-[#D48C9E] text-[#2E1E2F] shadow-xs"
            : "bg-white border-[#EED7E2] text-[#826F84] hover:border-[#D48C9E]/60"
        }`}
      >
        <div className="flex items-center gap-3 truncate">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              value ? "bg-[#D48C9E] text-white" : "bg-[#FAF5F8] text-[#826F84]"
            }`}
          >
            {value ? <UserCheck className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </div>
          <div className="truncate">
            <p className="font-bold text-sm text-[#2E1E2F] truncate">
              {value ? value.clientName : "Seleccionar clienta..."}
            </p>
            <p className="text-[11px] text-[#826F84] font-medium leading-none mt-0.5">
              {value ? "Tocá para cambiar de clienta" : "Buscá o creá una nueva clienta"}
            </p>
          </div>
        </div>

        <span className="text-[#D48C9E] font-bold text-xs shrink-0 pl-2">
          {value ? "Cambiar" : "Elegir"}
        </span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Seleccionar Clienta">
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#826F84]" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe el nombre de la clienta..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] placeholder-[#826F84] font-medium text-sm focus:outline-none focus:border-[#D48C9E] focus:ring-2 focus:ring-[#D48C9E]/20"
            />
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={handleCreateClient}
              className="w-full py-2.5 px-4 rounded-xl bg-[#D48C9E] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#B96B80] active:scale-95 transition-all shadow-md shadow-[#D48C9E]/20"
            >
              <Plus className="w-4 h-4" />
              Crear clienta: "{query.trim()}"
            </button>
          )}

          <div className="max-h-60 overflow-y-auto divide-y divide-[#EED7E2]/50 border border-[#EED7E2] rounded-2xl bg-white">
            {items.length === 0 ? (
              <div className="p-6 text-center text-[#826F84] text-xs font-medium">
                {query ? "No se encontraron clientas" : "Escribe para buscar o crear"}
              </div>
            ) : (
              items.map((c) => {
                const isSelected = value?.clientId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange({ clientId: c.id, clientName: c.name });
                      setOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between text-sm font-bold transition-colors ${
                      isSelected
                        ? "bg-[#FBF0F4] text-[#D48C9E]"
                        : "text-[#2E1E2F] hover:bg-[#FAF5F8]"
                    }`}
                  >
                    <span>{c.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#D48C9E]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
