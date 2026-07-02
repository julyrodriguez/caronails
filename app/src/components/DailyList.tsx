import React from "react";
import { View, Text, Pressable } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAccount } from "../hooks/useAccount";
import { useAppointmentsByDay } from "../hooks/useAppointments";
import { THEME } from "../lib/theme";

export default function DailyList({ dayKey }: { dayKey: string }) {
  const { accountId } = useAccount();
  const { items } = useAppointmentsByDay(dayKey);

  const total = items.reduce((acc, x) => acc + (x.amount || 0), 0);

  async function togglePaid(it: any) {
    const ref = doc(db, "accounts", accountId, "appointments", it.id);
    await updateDoc(ref, { paid: !it.paid });
  }

  return (
    <View style={{ gap: 12 }}>
      {items.map((it) => (
        <View
          key={it.id}
          style={{
            backgroundColor: THEME.card,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 18,
            padding: 14,
          }}
        >
          <Text style={{ fontWeight: "900", color: THEME.text }}>
            {it.clientNameSnapshot}
          </Text>

          <Text style={{ color: THEME.muted }}>
            ${it.amount}
          </Text>

          <Pressable
            onPress={() => togglePaid(it)}
            style={{
              marginTop: 8,
              backgroundColor: it.paid ? "#DCFCE7" : "#FEF3C7",
              borderRadius: 999,
              paddingVertical: 6,
              paddingHorizontal: 12,
              alignSelf: "flex-start"
            }}
          >
            <Text style={{
              fontWeight: "900",
              color: it.paid ? THEME.success : THEME.warning
            }}>
              {it.paid ? "Pagó ✅" : "Pendiente ⏳"}
            </Text>
          </Pressable>
        </View>
      ))}

      <View
        style={{
          backgroundColor: THEME.primarySoft,
          borderWidth: 1,
          borderColor: THEME.border,
          borderRadius: 18,
          padding: 14,
        }}
      >
        <Text style={{ fontWeight: "900", color: THEME.primary }}>
          Total del día: ${total}
        </Text>
      </View>
    </View>
  );
}