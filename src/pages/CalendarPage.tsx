// src/pages/CalendarPage.tsx
import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  DollarSign,
  GraduationCap,
  Sparkles,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  BookOpen,
} from "lucide-react";
import confetti from "canvas-confetti";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import Modal from "../components/Modal";
import Toast, { ToastMessage } from "../components/Toast";
import { useAccount } from "../hooks/useAccount";
import {
  useAppointmentsByRange,
  updateAppointment,
  deleteAppointment,
  Appointment,
} from "../hooks/useAppointments";
import {
  useFacultySchedule,
  useExamDays,
  weekdayName,
} from "../hooks/useFacultySchedule";
import {
  dayKeyFromDate,
  monthKeyFromDate,
  startOfWeekMon,
  weekDaysMonToSat,
  startOfDay,
  startOfNextDay,
} from "../lib/keys";
import { fmtMoney, fmtTime, fmtDate } from "../lib/normalize";

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfNextMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const [, setLocation] = useLocation();
  const { accountId } = useAccount();

  const [mode, setMode] = useState<"calendar" | "week">("calendar");
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPaid, setEditPaid] = useState(false);

  // Month range query for appointments
  const rangeStart = useMemo(() => {
    const d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
    return startOfDay(d);
  }, [currentMonthDate]);

  const rangeEnd = useMemo(() => {
    const d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 2, 1);
    return startOfDay(d);
  }, [currentMonthDate]);

  const { items: allMonthAppointments, loading: apptsLoading } =
    useAppointmentsByRange(rangeStart, rangeEnd);

  // Faculty and exam hooks
  const { getBlocksForDay, hasFacultyOnDate } = useFacultySchedule();
  const { getExamsForDay, examDayKeys } = useExamDays();

  // Selected Day appointments
  const selectedDayKey = useMemo(() => dayKeyFromDate(selectedDate), [selectedDate]);

  const dayAppointments = useMemo(() => {
    return allMonthAppointments.filter((a) => {
      if (a.dayKey) return a.dayKey === selectedDayKey;
      if (!a.startAt) return false;
      const d = a.startAt.toDate ? a.startAt.toDate() : new Date(a.startAt.seconds * 1000);
      return sameDay(d, selectedDate);
    });
  }, [allMonthAppointments, selectedDayKey, selectedDate]);

  // Selected Day Faculty blocks & Exams
  const dayFacultyBlocks = useMemo(() => {
    return getBlocksForDay(selectedDate.getDay(), selectedDate);
  }, [getBlocksForDay, selectedDate]);

  const dayExams = useMemo(() => {
    return getExamsForDay(selectedDayKey);
  }, [getExamsForDay, selectedDayKey]);

  // Daily metrics
  const dailyPaidTotal = dayAppointments
    .filter((a) => a.paid && !a.canceled)
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const dailyPendingTotal = dayAppointments
    .filter((a) => !a.paid && !a.canceled)
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const dailyTotal = dailyPaidTotal + dailyPendingTotal;

  // Month Grid Calculation
  const monthGrid = useMemo(() => {
    const monthStart = startOfMonth(currentMonthDate);
    const monthEnd = startOfNextMonth(currentMonthDate);
    const gridStart = startOfWeekMon(monthStart);

    const cells: Date[] = [];
    for (let w = 0; w < 6; w++) {
      const weekStart = new Date(gridStart);
      weekStart.setDate(gridStart.getDate() + w * 7);

      if (w > 0 && weekStart >= monthEnd) break;

      for (let i = 0; i < 6; i++) {
        // Mon-Sat
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        cells.push(d);
      }
    }
    return cells;
  }, [currentMonthDate]);

  // Week Days (Mon-Sat around selectedDate)
  const currentWeekDays = useMemo(() => {
    return weekDaysMonToSat(selectedDate);
  }, [selectedDate]);

  // Toggle paid status
  async function handleTogglePaid(appt: Appointment, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!accountId) return;

    const newPaidStatus = !appt.paid;
    try {
      await updateAppointment(accountId, appt.id, { paid: newPaidStatus });
      if (newPaidStatus) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#D48C9E", "#4E9B78", "#EED7E2", "#FFD700"],
        });
        setToast({
          type: "ok",
          title: "¡Turno Cobrado!",
          message: `Se marcó como pagado el turno de ${appt.clientNameSnapshot}`,
        });
      }
    } catch (err: any) {
      setToast({
        type: "err",
        title: "Error",
        message: "No se pudo actualizar el estado de pago",
      });
    }
  }

  // Handle Edit appointment
  function openEditModal(appt: Appointment) {
    setSelectedAppt(appt);
    setEditAmount(String(appt.amount || ""));
    setEditDescription(appt.description || "");
    setEditPaid(Boolean(appt.paid));
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    if (!selectedAppt || !accountId) return;
    try {
      await updateAppointment(accountId, selectedAppt.id, {
        amount: Number(editAmount) || 0,
        description: editDescription.trim(),
        paid: editPaid,
      });

      if (editPaid && !selectedAppt.paid) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#D48C9E", "#4E9B78", "#FFD700"],
        });
      }

      setIsEditing(false);
      setSelectedAppt(null);
      setToast({
        type: "ok",
        title: "Turno Actualizado",
        message: "Los cambios fueron guardados exitosamente.",
      });
    } catch (err: any) {
      setToast({
        type: "err",
        title: "Error al actualizar",
        message: err.message,
      });
    }
  }

  // Handle Delete appointment
  async function handleDeleteAppointment(apptId: string) {
    if (!accountId) return;
    if (!window.confirm("¿Seguro que deseas eliminar este turno?")) return;

    try {
      await deleteAppointment(accountId, apptId);
      setIsEditing(false);
      setSelectedAppt(null);
      setToast({
        type: "ok",
        title: "Turno Eliminado",
        message: "El turno fue eliminado del calendario.",
      });
    } catch (err: any) {
      setToast({
        type: "err",
        title: "Error",
        message: "No se pudo eliminar el turno",
      });
    }
  }

  function changeMonth(delta: number) {
    const next = new Date(currentMonthDate);
    next.setMonth(next.getMonth() + delta);
    setCurrentMonthDate(next);
  }

  return (
    <div className="min-h-screen bg-[#FAF5F8] pb-24">
      <AppHeader subtitle="Agenda y Planificación" />
      <Toast flash={toast} onClose={() => setToast(null)} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Mode Selector Capsule */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-[#FBF0F4] p-1 rounded-2xl border border-[#EED7E2] w-fit">
            <button
              onClick={() => setMode("calendar")}
              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                mode === "calendar"
                  ? "bg-white text-[#D48C9E] shadow-xs"
                  : "text-[#826F84] hover:text-[#2E1E2F]"
              }`}
            >
              Mes Completo
            </button>
            <button
              onClick={() => setMode("week")}
              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                mode === "week"
                  ? "bg-white text-[#D48C9E] shadow-xs"
                  : "text-[#826F84] hover:text-[#2E1E2F]"
              }`}
            >
              Semanal
            </button>
          </div>

          <button
            onClick={() => setLocation(`/appointments?date=${selectedDayKey}`)}
            className="px-3.5 py-1.5 rounded-2xl bg-[#D48C9E] text-white font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#B96B80] active:scale-95 transition-all shadow-md shadow-[#D48C9E]/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Turno</span>
          </button>
        </div>

        {/* View 1: Month Calendar Grid */}
        {mode === "calendar" && (
          <div className="glass-card rounded-3xl p-4 sm:p-5 subtle-shadow border border-[#EED7E2]">
            {/* Month Header Navigation */}
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-base font-extrabold text-[#2E1E2F] capitalize">
                {currentMonthDate.toLocaleDateString("es-AR", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => changeMonth(-1)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FAF5F8] border border-[#EED7E2] text-[#826F84] hover:text-[#2E1E2F] hover:bg-[#FBF0F4] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMonthDate(new Date())}
                  className="px-2.5 h-8 rounded-xl flex items-center justify-center bg-[#FBF0F4] border border-[#EED7E2] text-[#D48C9E] text-xs font-bold hover:bg-white transition-colors"
                >
                  Hoy
                </button>
                <button
                  onClick={() => changeMonth(1)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FAF5F8] border border-[#EED7E2] text-[#826F84] hover:text-[#2E1E2F] hover:bg-[#FBF0F4] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of week header (Lun - Sáb) */}
            <div className="grid grid-cols-6 gap-1 text-center mb-1">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                <div key={d} className="text-[11px] font-extrabold text-[#826F84] py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Month Cells Grid */}
            <div className="grid grid-cols-6 gap-1">
              {monthGrid.map((date, idx) => {
                const dayKey = dayKeyFromDate(date);
                const isSelected = sameDay(date, selectedDate);
                const isCurrentMonth = date.getMonth() === currentMonthDate.getMonth();
                const isToday = sameDay(date, new Date());

                // Turnos del día
                const countAppts = allMonthAppointments.filter(
                  (a) => a.dayKey === dayKey && !a.canceled
                ).length;

                // Eventos del día
                const hasFaculty = hasFacultyOnDate(date);
                const hasExam = examDayKeys.has(dayKey);

                const hasAppts = countAppts > 0;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    className={`relative min-h-[58px] p-1 rounded-2xl flex flex-col items-center justify-between transition-all duration-150 active:scale-95 ${
                      isSelected
                        ? "bg-[#D48C9E] text-white shadow-md shadow-[#D48C9E]/35 border-2 border-[#D48C9E]"
                        : isToday
                        ? `bg-[#FCD8E3] text-[#2E1E2F] font-black ${hasAppts ? "border-2 border-[#D48C9E]" : "border border-[#F3BCCB]"} shadow-xs`
                        : hasAppts
                        ? "bg-white text-[#2E1E2F] border-2 border-[#D48C9E] font-bold shadow-xs hover:bg-[#FBF0F4]"
                        : isCurrentMonth
                        ? "bg-[#FAF5F8]/70 hover:bg-white text-[#2E1E2F] border border-[#EED7E2]/50"
                        : "bg-transparent text-[#826F84]/35 border border-transparent"
                    }`}
                  >
                    <span
                      className={`text-xs font-black ${
                        isSelected ? "text-white" : isToday ? "text-[#2E1E2F]" : ""
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {/* Indicator Dots / Badges */}
                    <div className="flex items-center gap-0.5 mt-auto mb-0.5">
                      {countAppts > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-white" : "bg-[#D48C9E]"
                          }`}
                          title={`${countAppts} turnos`}
                        />
                      )}
                      {hasFaculty && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-white/80" : "bg-[#7D6B90]"
                          }`}
                          title="Facultad"
                        />
                      )}
                      {hasExam && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-amber-300" : "bg-[#C57D5D]"
                          }`}
                          title="Examen"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* View 2: Week Strip Carousel */}
        {mode === "week" && (
          <div className="glass-card rounded-3xl p-4 subtle-shadow border border-[#EED7E2]">
            <div className="flex items-center justify-between gap-1">
              {currentWeekDays.map((date) => {
                const isSelected = sameDay(date, selectedDate);
                const isToday = sameDay(date, new Date());
                const dk = dayKeyFromDate(date);
                const count = allMonthAppointments.filter(
                  (a) => a.dayKey === dk && !a.canceled
                ).length;
                const hasAppts = count > 0;
                const hasFaculty = hasFacultyOnDate(date);
                const hasExam = examDayKeys.has(dk);

                return (
                  <button
                    key={dk}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-1 py-3 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? "bg-[#D48C9E] text-white shadow-md shadow-[#D48C9E]/35 border-2 border-[#D48C9E] scale-105"
                        : isToday
                        ? `bg-[#FCD8E3] text-[#2E1E2F] font-black ${hasAppts ? "border-2 border-[#D48C9E]" : "border border-[#F3BCCB]"}`
                        : hasAppts
                        ? "bg-white text-[#2E1E2F] border-2 border-[#D48C9E] shadow-xs font-bold hover:bg-[#FBF0F4]"
                        : "bg-[#FAF5F8] text-[#2E1E2F] hover:bg-white border border-[#EED7E2]"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-extrabold opacity-80">
                      {weekdayName(date.getDay()).slice(0, 3)}
                    </span>
                    <span className="text-sm font-black">{date.getDate()}</span>
                    <div className="flex gap-0.5">
                      {count > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-white" : "bg-[#D48C9E]"
                          }`}
                        />
                      )}
                      {(hasFaculty || hasExam) && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-white/70" : "bg-[#7D6B90]"
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Day Agenda Header */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EED7E2] subtle-shadow space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#2E1E2F] capitalize truncate">
                  {selectedDate.toLocaleDateString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                  })}
                </h3>
                {sameDay(selectedDate, new Date()) && (
                  <span className="px-2 py-0.5 rounded-full bg-[#FBF0F4] text-[#D48C9E] text-[10px] font-extrabold border border-[#EED7E2] shrink-0">
                    Hoy
                  </span>
                )}
              </div>
              <p className="text-xs text-[#826F84] font-semibold mt-0.5">
                {dayAppointments.length === 0
                  ? "Sin turnos agendados"
                  : `${dayAppointments.length} ${dayAppointments.length === 1 ? "turno agendado" : "turnos agendados"}`}
              </p>
            </div>

            {/* Daily revenue metrics */}
            {dailyTotal > 0 ? (
              <div className="text-right shrink-0">
                <div className="text-sm sm:text-base font-black text-[#2E1E2F]">
                  ${fmtMoney(dailyTotal)}
                </div>
                <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold mt-0.5">
                  {dailyPaidTotal > 0 && (
                    <span className="text-[#4E9B78]">${fmtMoney(dailyPaidTotal)} cobrado</span>
                  )}
                  {dailyPendingTotal > 0 && (
                    <span className="text-[#DFA559]">
                      {dailyPaidTotal > 0 ? "• " : ""}${fmtMoney(dailyPendingTotal)} pendiente
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-right shrink-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold text-[#826F84] bg-[#FAF5F8] border border-[#EED7E2]">
                  Día libre ✨
                </span>
              </div>
            )}
          </div>

          {/* Banner of Faculty or Exam if any today */}
          {(dayFacultyBlocks.length > 0 || dayExams.length > 0) && (
            <div className="pt-2.5 border-t border-[#EED7E2]/50 space-y-2">
              {dayFacultyBlocks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#F3EEF7] border border-[#D8CFE0] text-[#7D6B90]"
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <div className="text-xs font-bold truncate">
                    <span>{b.label || "Facultad"}:</span>{" "}
                    <span className="font-semibold text-[#2E1E2F]">
                      {b.startTime} a {b.endTime} hs
                    </span>
                  </div>
                </div>
              ))}

              {dayExams.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#FAF1EC] border border-[#E8D2C5] text-[#C57D5D]"
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <div className="text-xs font-bold truncate">
                    <span>Parcial / Examen:</span>{" "}
                    <span className="font-semibold text-[#2E1E2F]">
                      {e.label} {e.startTime ? `(${e.startTime} hs)` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Day Appointments List */}
        <div className="space-y-2.5">
          {dayAppointments.length === 0 ? (
            <div className="bg-white/80 rounded-3xl p-8 text-center border border-[#EED7E2] subtle-shadow space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FBF0F4] text-[#D48C9E] flex items-center justify-center mx-auto">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#2E1E2F]">
                  No hay turnos para este día
                </h4>
                <p className="text-xs text-[#826F84] font-medium mt-1 max-w-xs mx-auto">
                  Aprovechá para estudiar o agregá un nuevo turno para esta fecha.
                </p>
              </div>
              <button
                onClick={() => setLocation(`/appointments?date=${selectedDayKey}`)}
                className="px-4 py-2 rounded-xl bg-[#D48C9E] text-white text-xs font-extrabold hover:bg-[#B96B80] active:scale-95 transition-all shadow-md shadow-[#D48C9E]/20"
              >
                + Agendar Turno
              </button>
            </div>
          ) : (
            dayAppointments.map((appt) => {
              const apptDate = appt.startAt?.toDate
                ? appt.startAt.toDate()
                : new Date(appt.startAt?.seconds * 1000 || 0);

              return (
                <div
                  key={appt.id}
                  onClick={() => openEditModal(appt)}
                  className="group bg-white rounded-3xl p-3.5 sm:p-4 border border-[#EED7E2] subtle-shadow hover:border-[#D48C9E]/50 transition-all cursor-pointer flex items-center justify-between gap-3.5 active:scale-[0.99]"
                >
                  {/* Left: 24hs Time Block */}
                  <div className="w-16 h-14 rounded-2xl bg-[#FBF0F4] border border-[#EED7E2] flex flex-col items-center justify-center shrink-0 shadow-xs">
                    <span className="text-sm font-black text-[#2E1E2F] tracking-tight leading-none">
                      {fmtTime(apptDate)}
                    </span>
                    <span className="text-[10px] font-extrabold text-[#D48C9E] uppercase tracking-wider mt-1 leading-none">
                      hs
                    </span>
                  </div>

                  {/* Middle: Client and Service Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm sm:text-base text-[#2E1E2F] truncate">
                      {appt.clientNameSnapshot}
                    </h4>
                    <p className="text-xs text-[#826F84] font-medium truncate mt-0.5">
                      {appt.description || "Servicio de Manicuría"}
                    </p>
                    <div className="text-xs font-black text-[#D48C9E] mt-1">
                      ${fmtMoney(appt.amount)}
                    </div>
                  </div>

                  {/* Right: Payment status button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePaid(appt, e)}
                      className={`px-3 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs ${
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
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Appointment Details & Edit Modal */}
      <Modal
        isOpen={isEditing}
        onClose={() => {
          setIsEditing(false);
          setSelectedAppt(null);
        }}
        title="Detalles del Turno"
      >
        {selectedAppt && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#FBF0F4] border border-[#EED7E2]">
              <div className="text-xs font-bold text-[#826F84] uppercase tracking-wider">
                Clienta
              </div>
              <div className="text-base font-black text-[#2E1E2F] mt-0.5">
                {selectedAppt.clientNameSnapshot}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
                Monto ($)
              </label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="Ej: 15000"
                className="w-full px-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-bold text-sm focus:outline-none focus:border-[#D48C9E]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
                Estado del Cobro
              </label>
              <button
                type="button"
                onClick={() => setEditPaid(!editPaid)}
                className={`w-full py-3 px-4 rounded-2xl border flex items-center justify-between text-xs font-extrabold transition-all active:scale-[0.99] ${
                  editPaid
                    ? "bg-[#EBF8F2] border-[#A7F3D0] text-[#4E9B78]"
                    : "bg-[#FFFBEB] border-[#FDE68A] text-[#DFA559]"
                }`}
              >
                <span className="flex items-center gap-2">
                  {editPaid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{editPaid ? "Cobrado / Pagado ✅" : "Pendiente de Cobro ⏳"}</span>
                </span>
                <span className="text-[10px] underline">Tocar para cambiar</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
                Descripción / Servicio
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                placeholder="Ej: Semipermanente con soft gel y diseño nail art..."
                className="w-full px-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-medium text-sm focus:outline-none focus:border-[#D48C9E] resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleDeleteAppointment(selectedAppt.id)}
                className="px-4 py-3 rounded-2xl bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] text-xs font-extrabold hover:bg-red-100 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#D48C9E] text-white text-xs font-extrabold hover:bg-[#B96B80] active:scale-95 transition-all shadow-md shadow-[#D48C9E]/20"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        )}
      </Modal>

      <BottomNav />
    </div>
  );
}
