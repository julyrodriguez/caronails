import React from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  addDoc,
  doc,
  updateDoc,
    deleteDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAccount } from "./useAccount";
import { normalizeText } from "../lib/normalize";

import { useEffect, useState } from "react";

export type Client = {
  id: string;
  name: string;
  nameLower: string;
  phone?: string;
  createdAt?: any;
};



export async function deleteClientCascade(
  accountId: string,
  clientId: string
) {
  const batch = writeBatch(db);

  // 🔥 1) Buscar turnos de esa clienta
  const apptRef = collection(db, "accounts", accountId, "appointments");

  const q = query(apptRef, where("clientId", "==", clientId));
  const snap = await getDocs(q);

  snap.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  // 🔥 2) Borrar la clienta
  const clientRef = doc(db, "accounts", accountId, "clients", clientId);
  batch.delete(clientRef);

  await batch.commit();
}
/**
 * Hook para buscar clientas con startsWith
 */
export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    });

    return unsub;
  }, []);

  return { clients };
}

export async function createClient(name: string) {
  const ref = await addDoc(collection(db, "clients"), {
    name,
    createdAt: new Date(),
  });
  return ref.id;
}

export function useClientsSearch(text: string) {
  const { accountId } = useAccount();
  const [items, setItems] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);

  const q = normalizeText(text);

  React.useEffect(() => {
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