// src/hooks/useClients.ts
import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  addDoc,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAccount } from "./useAccount";
import { normalizeText } from "../lib/normalize";

export type Client = {
  id: string;
  name: string;
  nameLower: string;
  phone?: string;
  createdAt?: any;
};

export async function deleteClientCascade(accountId: string, clientId: string) {
  const batch = writeBatch(db);

  // 1) Turnos de la clienta
  const apptRef = collection(db, "accounts", accountId, "appointments");
  const q = query(apptRef, where("clientId", "==", clientId));
  const snap = await getDocs(q);

  snap.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  // 2) Documento de la clienta
  const clientRef = doc(db, "accounts", accountId, "clients", clientId);
  batch.delete(clientRef);

  await batch.commit();
}

export function useClientsSearch(text: string) {
  const { accountId } = useAccount();
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const q = normalizeText(text);

  useEffect(() => {
    if (!accountId) return;
    const ref = collection(db, "accounts", accountId, "clients");

    const qy =
      q.length === 0
        ? query(ref, orderBy("nameLower", "asc"))
        : query(
            ref,
            where("nameLower", ">=", q),
            where("nameLower", "<", q + "\uf8ff"),
            orderBy("nameLower", "asc")
          );

    const unsub = onSnapshot(qy, (snap) => {
      const arr = snap.docs.slice(0, 50).map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setItems(arr);
      setLoading(false);
    });

    return () => unsub();
  }, [accountId, q]);

  return { items, loading };
}

export async function createClientDirect(accountId: string, name: string, phone?: string) {
  const ref = collection(db, "accounts", accountId, "clients");
  const docRef = await addDoc(ref, {
    name: name.trim(),
    nameLower: normalizeText(name),
    phone: phone?.trim() || "",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
