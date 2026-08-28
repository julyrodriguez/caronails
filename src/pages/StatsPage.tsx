// src/pages/StatsPage.tsx
import React, { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle2,
  AlertCircle,
  Save,
  Calendar,
  Sparkles,
} from "lucide-react";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import Toast, { ToastMessage } from "../components/Toast";
import { useMonthlyStats, useYearlyStats } from "../hooks/useStats";
import { fmtMoney } from "../lib/normalize";

function nowMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function StatsPage() {
  const [tab, setTab] = useState<"month" | "year">("month");
  const [monthKey, setMonthKey] = useState(() => nowMonthKey());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Monthly stats
  const {
    incomePaid,
    incomePending,
    supplies,
    net,
    paidCount,
    pendingCount,
    setMonthlySupplies,
  } = useMonthlyStats(monthKey);

  // Yearly stats
  const { months: yearlyMonths, totalPaid: yearlyTotalPaid, avgMonthly } =
    useYearlyStats(year);

  // Insumos input state
  const [inputSupplies, setInputSupplies] = useState("");
  const [isEditingSupplies, setIsEditingSupplies] = useState(false);

  function changeMonth(delta: number) {
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthKey(nowMonthKey(d));
    setIsEditingSupplies(false);
  }

  async function handleSaveSupplies() {
    try {
      await setMonthlySupplies(Number(inputSupplies) || 0);
      setIsEditingSupplies(false);
      setToast({
        type: "ok",
        title: "Insumos Guardados",
        message: `Se actualizaron los gastos en insumos a $${fmtMoney(Number(inputSupplies))}`,
      });
    } catch (err: any) {
      setToast({
        type: "err",
        title: "Error",
        message: err.message,
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF5F8] pb-24">
      <AppHeader title="Estadísticas" subtitle="Balances y Control Financiero" />
      <Toast flash={toast} onClose={() => setToast(null)} />

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Tab Selector */}
        <div className="flex bg-[#FBF0F4] p-1 rounded-2xl border border-[#EED7E2] w-full">
          <button
            onClick={() => setTab("month")}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
              tab === "month"
                ? "bg-white text-[#D48C9E] shadow-xs"
                : "text-[#826F84] hover:text-[#2E1E2F]"
            }`}
          >
            Control Mensual
          </button>
          <button
            onClick={() => setTab("year")}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
              tab === "year"
                ? "bg-white text-[#D48C9E] shadow-xs"
                : "text-[#826F84] hover:text-[#2E1E2F]"
            }`}
          >
            Balance Anual
          </button>
        </div>

        {/* Tab 1: Control Mensual */}
        {tab === "month" && (
          <div className="space-y-4 animate-fade-in">
            {/* Month Navigator Header */}
            <div className="flex items-center justify-between glass-card p-3 rounded-2xl border border-[#EED7E2]">
              <button
                onClick={() => changeMonth(-1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FAF5F8] border border-[#EED7E2] text-[#826F84] hover:text-[#2E1E2F] hover:bg-[#FBF0F4] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-sm font-black text-[#2E1E2F] capitalize">
                  {(() => {
                    const [y, m] = monthKey.split("-").map(Number);
                    return `${MONTH_NAMES[m - 1]} ${y}`;
                  })()}
                </span>
              </div>

              <button
                onClick={() => changeMonth(1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FAF5F8] border border-[#EED7E2] text-[#826F84] hover:text-[#2E1E2F] hover:bg-[#FBF0F4] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Big Net Profit Card */}
            <div className="glass-card rounded-3xl p-6 border border-[#EED7E2] subtle-shadow text-center space-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D48C9E]/10 rounded-full blur-2xl pointer-events-none" />
              <div className="text-xs font-bold text-[#826F84] uppercase tracking-wider">
                Ganancia Neta del Mes
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[#2E1E2F] tracking-tight">
                ${fmtMoney(net)}
              </div>
              <p className="text-xs text-[#826F84] font-medium">
                (Total Cobrado menos Gastos de Insumos)
              </p>
            </div>

            {/* Income and Expenses Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Cobrado */}
              <div className="bg-[#EBF8F2] border border-[#A7F3D0] rounded-3xl p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#4E9B78]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cobrado</span>
                </div>
                <div className="text-xl font-black text-[#2E1E2F]">
                  ${fmtMoney(incomePaid)}
                </div>
                <div className="text-[11px] font-bold text-[#4E9B78]">
                  {paidCount} {paidCount === 1 ? "turno cobrado" : "turnos cobrados"}
                </div>
              </div>

              {/* Pendiente */}
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-3xl p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#DFA559]">
                  <AlertCircle className="w-4 h-4" />
                  <span>Por Cobrar</span>
                </div>
                <div className="text-xl font-black text-[#2E1E2F]">
                  ${fmtMoney(incomePending)}
                </div>
                <div className="text-[11px] font-bold text-[#DFA559]">
                  {pendingCount} {pendingCount === 1 ? "pendiente" : "pendientes"}
                </div>
              </div>
            </div>

            {/* Supplies / Expenses Input Section */}
            <div className="bg-white rounded-3xl p-5 border border-[#EED7E2] subtle-shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#D48C9E]" />
                  <h4 className="text-sm font-extrabold text-[#2E1E2F]">
                    Gastos e Insumos del Mes
                  </h4>
                </div>
                <span className="text-sm font-black text-[#C57D5D]">
                  ${fmtMoney(supplies)}
                </span>
              </div>

              {!isEditingSupplies ? (
                <button
                  onClick={() => {
                    setInputSupplies(String(supplies || ""));
                    setIsEditingSupplies(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-[#FAF5F8] border border-[#EED7E2] text-xs font-bold text-[#826F84] hover:text-[#2E1E2F] hover:bg-[#FBF0F4] transition-all"
                >
                  {supplies > 0 ? "Modificar gasto de insumos" : "+ Registrar gasto de insumos"}
                </button>
              ) : (
                <div className="flex items-center gap-2 pt-1 animate-fade-in">
                  <input
                    type="number"
                    autoFocus
                    value={inputSupplies}
                    onChange={(e) => setInputSupplies(e.target.value)}
                    placeholder="Monto de insumos..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#FAF5F8] border border-[#EED7E2] text-sm font-bold text-[#2E1E2F] focus:outline-none focus:border-[#D48C9E]"
                  />
                  <button
                    onClick={handleSaveSupplies}
                    className="px-3.5 py-2 rounded-xl bg-[#D48C9E] text-white text-xs font-extrabold hover:bg-[#B96B80] active:scale-95 transition-all flex items-center gap-1 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar</span>
                  </button>
                  <button
                    onClick={() => setIsEditingSupplies(false)}
                    className="px-3 py-2 rounded-xl bg-[#FAF5F8] border border-[#EED7E2] text-xs font-bold text-[#826F84]"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Balance Anual */}
        {tab === "year" && (
          <div className="space-y-4 animate-fade-in">
            {/* Year Navigator */}
            <div className="flex items-center justify-between glass-card p-3 rounded-2xl border border-[#EED7E2]">
              <button
                onClick={() => setYear((y) => y - 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FAF5F8] border border-[#EED7E2] text-[#826F84] hover:text-[#2E1E2F] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-base font-black text-[#2E1E2F]">Año {year}</span>

              <button
                onClick={() => setYear((y) => y + 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FAF5F8] border border-[#EED7E2] text-[#826F84] hover:text-[#2E1E2F] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Annual KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-3xl p-4 border border-[#EED7E2] subtle-shadow text-center space-y-1">
                <div className="text-xs font-bold text-[#826F84] uppercase tracking-wider">
                  Total Facturado
                </div>
                <div className="text-xl font-black text-[#4E9B78]">
                  ${fmtMoney(yearlyTotalPaid)}
                </div>
              </div>

              <div className="glass-card rounded-3xl p-4 border border-[#EED7E2] subtle-shadow text-center space-y-1">
                <div className="text-xs font-bold text-[#826F84] uppercase tracking-wider">
                  Promedio Mensual
                </div>
                <div className="text-xl font-black text-[#D48C9E]">
                  ${fmtMoney(Math.round(avgMonthly))}
                </div>
              </div>
            </div>

            {/* 12 Months Breakdown List */}
            <div className="bg-white rounded-3xl p-5 border border-[#EED7E2] subtle-shadow space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#826F84] px-1">
                Desglose Mensual {year}
              </h4>

              <div className="divide-y divide-[#EED7E2]/50">
                {yearlyMonths.map((m, idx) => {
                  const maxVal = Math.max(...yearlyMonths.map((x) => x.paid), 1);
                  const percentage = Math.round((m.paid / maxVal) * 100);

                  return (
                    <div key={m.monthKey} className="py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#2E1E2F]">
                          {MONTH_NAMES[idx]}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#4E9B78]">
                            ${fmtMoney(m.paid)}
                          </span>
                          {m.pending > 0 && (
                            <span className="text-[10px] text-[#DFA559] font-bold">
                              (+${fmtMoney(m.pending)})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress visual bar */}
                      <div className="w-full h-2 rounded-full bg-[#FAF5F8] overflow-hidden border border-[#EED7E2]/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#D48C9E] to-[#4E9B78] transition-all duration-500"
                          style={{ width: `${m.paid > 0 ? Math.max(percentage, 4) : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
