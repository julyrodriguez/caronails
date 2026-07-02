import React from "react";
import { collection, onSnapshot, orderBy, query, where, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAccount } from "./useAccount";
import { dateFromDayKey, startOfNextDay } from "../lib/keys";
import { deleteDoc, doc, updateDoc,addDoc } from "firebase/firestore";

export async function deleteAppointment(id: string) {
  await deleteDoc(doc(db, "appointments", id));
}

export async function updateAppointment(
  id: string,
  data: Partial<{
    amount: number;
    paid: boolean;
    description: string;
  }>
) {
  await updateDoc(doc(db, "appointments", id), data);
}

export async function createAppointment(data: any) {
  await addDoc(collection(db, "appointments"), data);
}
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



export function useAppointmentsByDay(dayKey?: string) {
  const { accountId } = useAccount();
  const [items, setItems] = React.useState<Appointment[]>([]);

  React.useEffect(() => {
    if (!accountId || !dayKey) {
      setItems([]);
      return;
    }

    // ✅ Query index-proof: rango por startAt + orderBy startAt
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
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Appointment[];
      setItems(arr);
    });

    return () => unsub();
  }, [accountId, dayKey]);

  return { items };
}

export function useAppointmentsByRange(start?: Date, endExclusive?: Date) {
  const { accountId } = useAccount();
  const [items, setItems] = React.useState<Appointment[]>([]);

  React.useEffect(() => {
    if (!accountId || !start || !endExclusive) {
      setItems([]);
      return;
    }

    // ✅ index-proof: rango por startAt + orderBy startAt
    const ref = collection(db, "accounts", accountId, "appointments");
    const qy = query(
      ref,
      where("startAt", ">=", Timestamp.fromDate(start)),
      where("startAt", "<", Timestamp.fromDate(endExclusive)),
      orderBy("startAt", "asc")
    );

    const unsub = onSnapshot(qy, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Appointment[];
      setItems(arr);
    });

    return () => unsub();
  }, [accountId, start?.getTime(), endExclusive?.getTime()]);

  return { items };
}