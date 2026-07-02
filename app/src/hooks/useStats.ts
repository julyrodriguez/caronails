import React from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAccount } from "./useAccount";

type Appointment = {
  id: string;
  monthKey: string;
  amount: number;
  paid: boolean;
  canceled?: boolean;
  startAt: any;
};

export function useMonthlyStats(monthKey: string) {
  const { accountId } = useAccount();

  const [incomePaid, setIncomePaid] = React.useState(0);
  const [incomePending, setIncomePending] = React.useState(0);
  const [supplies, setSupplies] = React.useState(0);

  React.useEffect(() => {
    const apRef = collection(db, "accounts", accountId, "appointments");
    const qy = query(
      apRef,
      where("monthKey", "==", monthKey),
      orderBy("startAt", "asc")
    );
    if (!accountId || !monthKey) {
      // opcional: reset
      setIncomePaid(0);
      setIncomePending(0);
      setSupplies(0);
      return;
    }
    const unsubApts = onSnapshot(qy, (snap) => {
      const rows = snap.docs.map((d) => d.data() as Appointment);

      const paid = rows
        .filter((x) => x.paid && !x.canceled)
        .reduce((acc, x) => acc + (Number(x.amount) || 0), 0);

      const pending = rows
        .filter((x) => !x.paid && !x.canceled)
        .reduce((acc, x) => acc + (Number(x.amount) || 0), 0);

      setIncomePaid(paid);
      setIncomePending(pending);
    });

    const mRef = doc(db, "accounts", accountId, "months", monthKey);

    const unsubMonth = onSnapshot(mRef, (snap) => {
      const data = snap.data() as any;
      setSupplies(Number(data?.supplies || 0));
    });

    return () => {
      unsubApts();
      unsubMonth();
    };
  }, [accountId, monthKey]);

  async function setMonthlySupplies(value: number) {
    const mRef = doc(db, "accounts", accountId, "months", monthKey);

    await setDoc(
      mRef,
      {
        supplies: value,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  const net = incomePaid - supplies;

  return {
    incomePaid,
    incomePending,
    supplies,
    net,
    setMonthlySupplies,
  };
}

export function useYearlyStats(year: number) {
  const { accountId } = useAccount();

  const [byMonth, setByMonth] = React.useState<
    Record<string, { paid: number; pending: number }>
  >({});

  React.useEffect(() => {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const apRef = collection(db, "accounts", accountId, "appointments");

    const qy = query(
      apRef,
      where("startAt", ">=", Timestamp.fromDate(start)),
      where("startAt", "<", Timestamp.fromDate(end)),
      orderBy("startAt", "asc")
    );

    const unsub = onSnapshot(qy, (snap) => {
      const map: Record<string, { paid: number; pending: number }> = {};

      snap.docs.forEach((d) => {
        const a = d.data() as any;
        const mk = String(a.monthKey || "");
        if (!mk) return;
        if (a.canceled) return; // Excluir turnos cancelados

        if (!map[mk]) map[mk] = { paid: 0, pending: 0 };

        const amt = Number(a.amount) || 0;

        if (a.paid) map[mk].paid += amt;
        else map[mk].pending += amt;
      });

      setByMonth(map);
    });

    return () => unsub();
  }, [accountId, year]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const mk = `${year}-${String(i + 1).padStart(2, "0")}`;
    const paid = byMonth[mk]?.paid ?? 0;
    const pending = byMonth[mk]?.pending ?? 0;

    return { monthKey: mk, paid, pending };
  });

  const totalPaid = months.reduce((acc, m) => acc + m.paid, 0);
  const avgMonthly = totalPaid / 12;

  return { months, totalPaid, avgMonthly };
}