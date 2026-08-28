// src/hooks/useStats.ts
import { useState, useEffect } from "react";
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

  const [incomePaid, setIncomePaid] = useState(0);
  const [incomePending, setIncomePending] = useState(0);
  const [supplies, setSupplies] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId || !monthKey) {
      setIncomePaid(0);
      setIncomePending(0);
      setSupplies(0);
      setPaidCount(0);
      setPendingCount(0);
      setLoading(false);
      return;
    }

    const apRef = collection(db, "accounts", accountId, "appointments");
    const qy = query(
      apRef,
      where("monthKey", "==", monthKey),
      orderBy("startAt", "asc")
    );

    const unsubApts = onSnapshot(qy, (snap) => {
      const rows = snap.docs.map((d) => d.data() as Appointment);

      const paidRows = rows.filter((x) => x.paid && !x.canceled);
      const pendingRows = rows.filter((x) => !x.paid && !x.canceled);

      const paid = paidRows.reduce((acc, x) => acc + (Number(x.amount) || 0), 0);
      const pending = pendingRows.reduce((acc, x) => acc + (Number(x.amount) || 0), 0);

      setIncomePaid(paid);
      setIncomePending(pending);
      setPaidCount(paidRows.length);
      setPendingCount(pendingRows.length);
      setLoading(false);
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
    paidCount,
    pendingCount,
    loading,
    setMonthlySupplies,
  };
}

export function useYearlyStats(year: number) {
  const { accountId } = useAccount();

  const [byMonth, setByMonth] = useState<
    Record<string, { paid: number; pending: number; count: number }>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;
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
      const map: Record<string, { paid: number; pending: number; count: number }> = {};

      snap.docs.forEach((d) => {
        const a = d.data() as any;
        const mk = String(a.monthKey || "");
        if (!mk) return;
        if (a.canceled) return;

        if (!map[mk]) map[mk] = { paid: 0, pending: 0, count: 0 };

        const amt = Number(a.amount) || 0;
        map[mk].count += 1;
        if (a.paid) map[mk].paid += amt;
        else map[mk].pending += amt;
      });

      setByMonth(map);
      setLoading(false);
    });

    return () => unsub();
  }, [accountId, year]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const mk = `${year}-${String(i + 1).padStart(2, "0")}`;
    const paid = byMonth[mk]?.paid ?? 0;
    const pending = byMonth[mk]?.pending ?? 0;
    const count = byMonth[mk]?.count ?? 0;

    return { monthKey: mk, paid, pending, count };
  });

  const totalPaid = months.reduce((acc, m) => acc + m.paid, 0);
  const avgMonthly = totalPaid / 12;

  return { months, totalPaid, avgMonthly, loading };
}
