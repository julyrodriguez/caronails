import React from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAccount } from "./useAccount";

export type FacultyBlock = {
  id: string;
  dayOfWeek: number; // 0=Dom, 1=Lun, ..., 6=Sáb
  startTime: string; // "14:00"
  endTime: string; // "18:00"
  label: string; // "Facultad", nombre materia, etc.
  active: boolean;
};

export type ExamDay = {
  id: string;
  date: string; // "YYYY-MM-DD"
  label: string; // "Parcial Matemática"
  startTime?: string;
  endTime?: string;
};

const WEEKDAY_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

export function weekdayName(day: number) {
  return WEEKDAY_NAMES[day] ?? `Día ${day}`;
}

/**
 * Hook para los bloques semanales de Facultad
 */
export function useFacultySchedule() {
  const { accountId } = useAccount();
  const [blocks, setBlocks] = React.useState<FacultyBlock[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!accountId) return;

    const ref = collection(db, "accounts", accountId, "facultySchedule");
    const qy = query(ref, orderBy("dayOfWeek", "asc"));

    const unsub = onSnapshot(qy, (snap) => {
      const arr = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FacultyBlock, "id">),
      }));
      setBlocks(arr);
      setLoading(false);
    });

    return () => unsub();
  }, [accountId]);

  // Conjunto de días de la semana con Facultad (para pintar calendario)
  const facultyDaysOfWeek = React.useMemo(() => {
    const set = new Set<number>();
    for (const b of blocks) {
      if (b.active) set.add(b.dayOfWeek);
    }
    return set;
  }, [blocks]);

  // Obtener bloques para un día de la semana
  const getBlocksForDay = React.useCallback(
    (dayOfWeek: number) => blocks.filter((b) => b.active && b.dayOfWeek === dayOfWeek),
    [blocks]
  );

  // Verificar si una fecha tiene facultad
  const hasFacultyOnDate = React.useCallback(
    (date: Date) => facultyDaysOfWeek.has(date.getDay()),
    [facultyDaysOfWeek]
  );

  // CRUD
  async function addBlock(block: Omit<FacultyBlock, "id">) {
    if (!accountId) return;
    const ref = collection(db, "accounts", accountId, "facultySchedule");
    await addDoc(ref, block);
  }

  async function removeBlock(blockId: string) {
    if (!accountId) return;
    const ref = doc(db, "accounts", accountId, "facultySchedule", blockId);
    await deleteDoc(ref);
  }

  return {
    blocks,
    loading,
    facultyDaysOfWeek,
    getBlocksForDay,
    hasFacultyOnDate,
    addBlock,
    removeBlock,
  };
}

/**
 * Hook para los días de parciales/exámenes
 */
export function useExamDays() {
  const { accountId } = useAccount();
  const [exams, setExams] = React.useState<ExamDay[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!accountId) return;

    const ref = collection(db, "accounts", accountId, "examDays");
    const qy = query(ref, orderBy("date", "asc"));

    const unsub = onSnapshot(qy, (snap) => {
      const arr = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ExamDay, "id">),
      }));
      setExams(arr);
      setLoading(false);
    });

    return () => unsub();
  }, [accountId]);

  // Set de dayKeys con parcial
  const examDayKeys = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of exams) set.add(e.date);
    return set;
  }, [exams]);

  // Obtener examen por dayKey
  const getExamForDay = React.useCallback(
    (dayKey: string) => exams.find((e) => e.date === dayKey) ?? null,
    [exams]
  );

  async function addExam(exam: Omit<ExamDay, "id">) {
    if (!accountId) return;
    const ref = collection(db, "accounts", accountId, "examDays");
    await addDoc(ref, exam);
  }

  async function removeExam(examId: string) {
    if (!accountId) return;
    const ref = doc(db, "accounts", accountId, "examDays", examId);
    await deleteDoc(ref);
  }

  return {
    exams,
    loading,
    examDayKeys,
    getExamForDay,
    addExam,
    removeExam,
  };
}
