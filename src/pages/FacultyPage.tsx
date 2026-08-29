import React, { useState, useMemo } from "react";
import {
  GraduationCap,
  BookOpen,
  Plus,
  Trash2,
  Clock,
  ChevronDown,
  Calendar as CalendarIcon,
  Info,
  Check,
} from "lucide-react";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import Modal from "../components/Modal";
import Toast, { ToastMessage } from "../components/Toast";
import {
  useFacultySchedule,
  useExamDays,
  weekdayName,
} from "../hooks/useFacultySchedule";
import { fmtDate } from "../lib/normalize";

const WEEKDAYS = [
  { label: "Lunes", value: 1 },
  { label: "Martes", value: 2 },
  { label: "Miércoles", value: 3 },
  { label: "Jueves", value: 4 },
  { label: "Viernes", value: 5 },
  { label: "Sábado", value: 6 },
];

export default function FacultyPage() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const { blocks, addBlock, removeBlock } = useFacultySchedule();
  const { exams, addExam, removeExam } = useExamDays();

  const todayKey = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [showPastExams, setShowPastExams] = useState(false);

  const upcomingExams = useMemo(
    () => exams.filter((e) => e.date >= todayKey),
    [exams, todayKey]
  );
  const pastExams = useMemo(
    () => exams.filter((e) => e.date < todayKey),
    [exams, todayKey]
  );

  // Modals state
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);

  // New Block form state
  const [blockDay, setBlockDay] = useState(1);
  const [blockLabel, setBlockLabel] = useState("");
  const [blockStart, setBlockStart] = useState("14:00");
  const [blockEnd, setBlockEnd] = useState("18:00");

  // New Exam form state
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [examLabel, setExamLabel] = useState("");
  const [examTime, setExamTime] = useState("09:00");

  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addBlock({
        dayOfWeek: blockDay,
        label: blockLabel.trim() || "Facultad",
        startTime: blockStart,
        endTime: blockEnd,
        active: true,
      });
      setIsBlockModalOpen(false);
      setBlockLabel("");
      setToast({
        type: "ok",
        title: "Horario Agregado",
        message: "El horario de cursada se reflejará en el calendario.",
      });
    } catch (err: any) {
      setToast({
        type: "err",
        title: "Error",
        message: err.message,
      });
    }
  }

  async function handleCreateExam(e: React.FormEvent) {
    e.preventDefault();
    if (!examLabel.trim()) return;

    try {
      await addExam({
        date: examDate,
        label: examLabel.trim(),
        startTime: examTime,
      });
      setIsExamModalOpen(false);
      setExamLabel("");
      setToast({
        type: "ok",
        title: "Examen Registrado",
        message: `Examen agendado para el ${examDate}.`,
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
      <AppHeader title="Facultad & Estudio" subtitle="Horarios de cursada y parciales" />
      <Toast flash={toast} onClose={() => setToast(null)} />

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-4 space-y-5">
        {/* Info Banner */}
        <div className="p-4 rounded-3xl bg-[#F3EEF7] border border-[#D8CFE0] flex items-start gap-3 text-[#7D6B90]">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold leading-relaxed">
            Los horarios fijos de cursada y las fechas de exámenes se muestran
            automáticamente en tu calendario para que organices tus turnos sin
            superponerlos.
          </p>
        </div>

        {/* Section 1: Weekly Class Schedule */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#7D6B90]" />
              <h3 className="text-sm font-black uppercase tracking-wider text-[#2E1E2F]">
                Horarios Semanales Fijos
              </h3>
            </div>

            <button
              onClick={() => setIsBlockModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#7D6B90] text-white text-xs font-extrabold flex items-center gap-1 hover:bg-[#68567A] active:scale-95 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Horario</span>
            </button>
          </div>

          <div className="space-y-2">
            {blocks.length === 0 ? (
              <div className="bg-white rounded-3xl p-6 text-center border border-[#EED7E2] text-xs font-medium text-[#826F84]">
                Aún no tienes horarios semanales cargados.
              </div>
            ) : (
              blocks.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-3xl p-4 border border-[#EED7E2] subtle-shadow flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3EEF7] border border-[#D8CFE0] flex flex-col items-center justify-center text-[#7D6B90]">
                      <span className="text-[10px] font-extrabold uppercase">
                        {weekdayName(b.dayOfWeek).slice(0, 3)}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-[#2E1E2F]">
                        {b.label || "Facultad"}
                      </h4>
                      <p className="text-xs text-[#7D6B90] font-semibold mt-0.5">
                        {b.startTime} hs a {b.endTime} hs
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeBlock(b.id)}
                    className="p-2 rounded-xl text-[#826F84] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Exam Days / Parciales */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#C57D5D]" />
              <h3 className="text-sm font-black uppercase tracking-wider text-[#2E1E2F]">
                Días de Parciales & Finales
              </h3>
            </div>

            <button
              onClick={() => setIsExamModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#C57D5D] text-white text-xs font-extrabold flex items-center gap-1 hover:bg-[#B06B4D] active:scale-95 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Examen</span>
            </button>
          </div>

          <div className="space-y-2">
            {upcomingExams.length === 0 ? (
              <div className="bg-white rounded-3xl p-6 text-center border border-[#EED7E2] text-xs font-medium text-[#826F84]">
                No tienes exámenes futuros registrados.
              </div>
            ) : (
              upcomingExams.map((e) => (
                <div
                  key={e.id}
                  className="bg-white rounded-3xl p-4 border border-[#EED7E2] subtle-shadow flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF1EC] border border-[#E8D2C5] flex flex-col items-center justify-center text-[#C57D5D]">
                      <BookOpen className="w-5 h-5" />
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-[#2E1E2F]">
                        {e.label}
                      </h4>
                      <p className="text-xs text-[#C57D5D] font-semibold mt-0.5">
                        {e.date} {e.startTime ? `• ${e.startTime} hs` : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeExam(e.id)}
                    className="p-2 rounded-xl text-[#826F84] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                    title="Eliminar examen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}

            {/* Collapsible Past Exams Section */}
            {pastExams.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowPastExams(!showPastExams)}
                  className="w-full py-3 px-4 rounded-2xl bg-white border border-[#EED7E2] flex items-center justify-between text-xs font-bold text-[#826F84] hover:text-[#2E1E2F] hover:border-[#D48C9E]/50 transition-all shadow-xs"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#826F84]" />
                    <span>Exámenes y parciales pasados ({pastExams.length})</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      showPastExams ? "rotate-180 text-[#D48C9E]" : ""
                    }`}
                  />
                </button>

                {showPastExams && (
                  <div className="mt-2 space-y-2 animate-fade-in">
                    {pastExams.map((e) => (
                      <div
                        key={e.id}
                        className="bg-white/80 rounded-3xl p-3.5 border border-[#EED7E2] flex items-center justify-between gap-3 opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] flex flex-col items-center justify-center text-[#826F84]">
                            <BookOpen className="w-4 h-4" />
                          </div>

                          <div>
                            <h4 className="font-bold text-xs text-[#2E1E2F]">
                              {e.label}
                            </h4>
                            <p className="text-[11px] text-[#826F84] font-medium mt-0.5">
                              {e.date} {e.startTime ? `• ${e.startTime} hs` : ""} (Finalizado)
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => removeExam(e.id)}
                          className="p-2 rounded-xl text-[#826F84] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                          title="Eliminar examen pasado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal 1: New Faculty Block */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        title="Nuevo Horario Semanal"
      >
        <form onSubmit={handleCreateBlock} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Día de la Semana
            </label>
            <select
              value={blockDay}
              onChange={(e) => setBlockDay(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-bold text-sm focus:outline-none focus:border-[#7D6B90]"
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Materia / Descripción
            </label>
            <input
              type="text"
              required
              value={blockLabel}
              onChange={(e) => setBlockLabel(e.target.value)}
              placeholder="Ej: Anatomía / Práctica Hospitalaria"
              className="w-full px-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-bold text-sm focus:outline-none focus:border-[#7D6B90]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
                Hora Inicio
              </label>
              <input
                type="time"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-bold text-sm focus:outline-none focus:border-[#7D6B90]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
                Hora Fin
              </label>
              <input
                type="time"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-bold text-sm focus:outline-none focus:border-[#7D6B90]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-[#7D6B90] text-white font-extrabold text-sm hover:bg-[#68567A] active:scale-95 transition-all shadow-md"
            >
              Guardar Horario Fijo
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: New Exam */}
      <Modal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        title="Registrar Fecha de Parcial / Final"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Fecha del Examen
            </label>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-bold text-sm focus:outline-none focus:border-[#C57D5D]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Nombre de la Materia / Examen
            </label>
            <input
              type="text"
              required
              value={examLabel}
              onChange={(e) => setExamLabel(e.target.value)}
              placeholder="Ej: 1° Parcial Bioquímica"
              className="w-full px-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-bold text-sm focus:outline-none focus:border-[#C57D5D]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#826F84] pl-1">
              Hora del Examen
            </label>
            <input
              type="time"
              value={examTime}
              onChange={(e) => setExamTime(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#FAF5F8] border border-[#EED7E2] text-[#2E1E2F] font-bold text-sm focus:outline-none focus:border-[#C57D5D]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-[#C57D5D] text-white font-extrabold text-sm hover:bg-[#B06B4D] active:scale-95 transition-all shadow-md"
            >
              Guardar Fecha de Examen
            </button>
          </div>
        </form>
      </Modal>

      <BottomNav />
    </div>
  );
}
