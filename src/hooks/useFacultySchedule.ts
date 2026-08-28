// src/hooks/useFacultySchedule.ts
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAccount } from "./useAccount";
import { dayKeyFromDate } from "../lib/keys";

export type FacultyBlock = {
  id: string;
  dayOfWeek: number; // 0=Dom, 1=Lun, ..., 6=Sáb
  startTime: string; // "14:00"
  endTime: string; // "18:00"
  label: string; // "Facultad", materia, etc.
  active: boolean;
  startDate?: string;
  endDate?: string;
};

export type ExamDay = {
  id: string;
  date: string; // "YYYY-MM-DD"
  label: string; // "Parcial Bioquímica"
  startTime?: string;
  endTime?: string;
  description?: string;
  isUniqueDay?: boolean;
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

export function useFacultySchedule() {
  const { accountId } = useAccount();
  const [blocks, setBlocks] = useState<FacultyBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const facultyDaysOfWeek = useMemo(() => {
    const set = new Set<number>();
    for (const b of blocks) {
      if (b.active) set.add(b.dayOfWeek);
    }
    return set;
  }, [blocks]);

  const getBlocksForDay = useCallback(
    (dayOfWeek: number, date?: Date) => {
      if (!date) {
        return blocks.filter((b) => b.active && b.dayOfWeek === dayOfWeek);
      }
      const dateStr = dayKeyFromDate(date);
      return blocks.filter(
        (b) =>
          b.active &&
          b.dayOfWeek === dayOfWeek &&
          (!b.startDate || dateStr >= b.startDate) &&
          (!b.endDate || dateStr <= b.endDate)
      );
    },
    [blocks]
  );

  const hasFacultyOnDate = useCallback(
    (date: Date) => {
      const dayOfWeek = date.getDay();
      const dateStr = dayKeyFromDate(date);
      return blocks.some(
        (b) =>
          b.active &&
          b.dayOfWeek === dayOfWeek &&
          (!b.startDate || dateStr >= b.startDate) &&
          (!b.endDate || dateStr <= b.endDate)
      );
    },
    [blocks]
  );

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

export function useExamDays() {
  const { accountId } = useAccount();
  const [exams, setExams] = useState<ExamDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const examDayKeys = useMemo(() => {
    const set = new Set<string>();
    for (const e of exams) set.add(e.date);
    return set;
  }, [exams]);

  const getExamForDay = useCallback(
    (dayKey: string) => exams.find((e) => e.date === dayKey) ?? null,
    [exams]
  );

  const getExamsForDay = useCallback(
    (dayKey: string) => exams.filter((e) => e.date === dayKey),
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
    getExamsForDay,
    addExam,
    removeExam,
  };
}
