// src/hooks/useClientAppointments.ts
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId || !accountId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const ref = collection(db, "accounts", accountId, "appointments");
    const q = query(ref, where("clientId", "==", clientId));

    const unsub = onSnapshot(q, (snap) => {
      const data: Appointment[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Appointment, "id">),
      }));

      // Ordenar cronológicamente descendente
      data.sort((a, b) => {
        const aDate = a.startAt?.toDate
          ? a.startAt.toDate()
          : new Date(a.startAt?.seconds * 1000 || 0);

        const bDate = b.startAt?.toDate
          ? b.startAt.toDate()
          : new Date(b.startAt?.seconds * 1000 || 0);

        return bDate.getTime() - aDate.getTime();
      });

      setItems(data);
      setLoading(false);
    });

    return () => unsub();
  }, [clientId, accountId]);

  return { items, loading };
}
