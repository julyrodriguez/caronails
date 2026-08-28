// src/hooks/useAppointments.ts
import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAccount } from "./useAccount";
import { dateFromDayKey, startOfNextDay } from "../lib/keys";

export type Appointment = {
  id: string;
  clientId: string;
  clientNameSnapshot: string;
  startAt: any;
  amount: number;
  paid: boolean;
  canceled?: boolean;
  description?: string;
  dayKey: string;
  monthKey: string;
  notificationId?: string;
};

export async function deleteAppointment(accountId: string, id: string) {
  await deleteDoc(doc(db, "accounts", accountId, "appointments", id));
}

export async function updateAppointment(
  accountId: string,
  id: string,
  data: Partial<{
    amount: number;
    paid: boolean;
    canceled: boolean;
    description: string;
    startAt: any;
    dayKey: string;
    monthKey: string;
  }>
) {
  await updateDoc(doc(db, "accounts", accountId, "appointments", id), data);
}

export async function createAppointment(accountId: string, data: any) {
  const ref = collection(db, "accounts", accountId, "appointments");
  return await addDoc(ref, data);
}

export function useAppointmentsByDay(dayKey?: string) {
  const { accountId } = useAccount();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId || !dayKey) {
      setItems([]);
      setLoading(false);
      return;
    }

    const dayStart = dateFromDayKey(dayKey);
    const dayEnd = startOfNextDay(dayStart);

    const ref = collection(db, "accounts", accountId, "appointments");
    const qy = query(
      ref,
      where("startAt", ">=", Timestamp.fromDate(dayStart)),
      where("startAt", "<", Timestamp.fromDate(dayEnd)),
      orderBy("startAt", "asc")
    );

    const unsub = onSnapshot(qy, (snap) => {
      const arr = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Appointment, "id">),
      }));
      setItems(arr);
      setLoading(false);
    });

    return () => unsub();
  }, [accountId, dayKey]);

  return { items, loading };
}

export function useAppointmentsByRange(start?: Date | null, end?: Date | null) {
  const { accountId } = useAccount();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId || !start || !end) {
      setItems([]);
      setLoading(false);
      return;
    }

    const ref = collection(db, "accounts", accountId, "appointments");
    const qy = query(
      ref,
      where("startAt", ">=", Timestamp.fromDate(start)),
      where("startAt", "<", Timestamp.fromDate(end)),
      orderBy("startAt", "asc")
    );

    const unsub = onSnapshot(qy, (snap) => {
      const arr = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Appointment, "id">),
      }));
      setItems(arr);
      setLoading(false);
    });

    return () => unsub();
  }, [accountId, start?.toISOString(), end?.toISOString()]);

  return { items, loading };
}
