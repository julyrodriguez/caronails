import React from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAccount } from "./useAccount";

export type Appointment = {
  id: string;
  startAt: any;
  amount?: number;
  paid?: boolean;
  canceled?: boolean;
  description?: string;
  clientNameSnapshot?: string;
  clientId: string;
};

export function useClientAppointments(clientId: string) {
  const { accountId } = useAccount();
  const [items, setItems] = React.useState<Appointment[]>([]);

  React.useEffect(() => {
    if (!clientId || !accountId) return;

    const ref = collection(
      db,
      "accounts",
      accountId,
      "appointments"
    );

    const q = query(ref, where("clientId", "==", clientId));

    const unsub = onSnapshot(q, (snap) => {
      const data: Appointment[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Appointment, "id">),
      }));

      // 🔥 Ordenamos en memoria
      data.sort((a, b) => {
        const aDate = a.startAt?.toDate
          ? a.startAt.toDate()
          : new Date(a.startAt?.seconds * 1000);

        const bDate = b.startAt?.toDate
          ? b.startAt.toDate()
          : new Date(b.startAt?.seconds * 1000);

        return bDate.getTime() - aDate.getTime();
      });

      setItems(data);
    });

    return () => unsub();
  }, [clientId, accountId]);

  return { items };
}