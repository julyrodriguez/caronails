import React from "react";
import { View, Text, TextInput, Pressable, FlatList, useWindowDimensions, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";

import AppHeader from "../src/components/AppHeader";
import { THEME } from "../src/lib/theme";
import { useClientsSearch } from "../src/hooks/useClients";
import { useClientAppointments } from "../src/hooks/useClientAppointments";

function fmtMoney(n: number) {
  return n.toLocaleString("es-AR");
}

function ClientRow({ item, onPress }: { item: any; onPress: () => void }) {
  const { items: appointments } = useClientAppointments(item.id);

  const totalTurns = appointments.length;
  const paidTurns = appointments.filter(a => a.paid && !a.canceled).length;
  const pendingTurns = appointments.filter(a => !a.paid && !a.canceled).length;
  const totalSpent = appointments
    .filter(a => a.paid && !a.canceled)
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "100%",
        backgroundColor: THEME.card,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 20,
        padding: 16,
        opacity: pressed ? 0.92 : 1,
        shadowColor: "#2E1E2F",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
      })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          {/* Client Name */}
          <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 16 }}>
            {item.name}
          </Text>

          {/* Stats Bar */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <View style={[s.statBadge, { backgroundColor: THEME.primarySoft }]}>
              <Text style={[s.statText, { color: THEME.primary }]}>
                💅 {totalTurns} Turno{totalTurns === 1 ? "" : "s"}
              </Text>
            </View>

            {pendingTurns > 0 && (
              <View style={[s.statBadge, { backgroundColor: THEME.examSoft }]}>
                <Text style={[s.statText, { color: THEME.exam }]}>
                  ⏳ {pendingTurns} impago{pendingTurns === 1 ? "" : "s"}
                </Text>
              </View>
            )}

            {totalSpent > 0 && (
              <View style={[s.statBadge, { backgroundColor: "#ECFDF5" }]}>
                <Text style={[s.statText, { color: THEME.success }]}>
                  💵 ${fmtMoney(totalSpent)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action arrow button */}
        <View
          style={{
            backgroundColor: THEME.primarySoft,
            borderRadius: 10,
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: THEME.primary, fontWeight: "900", fontSize: 14 }}>
            ›
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ClientsScreen() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const { items } = useClientsSearch(q);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === "ios" ? 44 : 20 }}>

      {/* Search Bar Container */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, alignItems: "center" }}>
        <View
          style={{
            backgroundColor: THEME.card,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 22,
            padding: 16,
            width: "100%",
            maxWidth: 520,
            shadowColor: "#2E1E2F",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.03,
            shadowRadius: 10,
          }}
        >
          <Text
            style={{
              fontWeight: "900",
              color: THEME.text,
              fontSize: 14,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Buscar Clienta
          </Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Introduce el nombre..."
            placeholderTextColor={THEME.muted}
            style={{
              backgroundColor: THEME.bg,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 14,
              padding: 12,
              fontWeight: "800",
              color: THEME.text,
              textAlign: "center",
              fontSize: 15,
            }}
          />
        </View>
      </View>

      {/* Client List */}
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 120,
          width: "100%",
          maxWidth: 520,
          alignSelf: "center",
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View
            style={{
              width: "100%",
              backgroundColor: THEME.card,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 20,
              padding: 30,
              alignItems: "center",
              marginTop: 20,
            }}
          >
            <Text style={{ fontSize: 24, marginBottom: 8 }}>🌸</Text>
            <Text style={{ fontWeight: "800", color: THEME.muted, fontSize: 14, textAlign: "center" }}>
              {q ? "No se encontraron clientas" : "No hay clientas registradas"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ClientRow
            item={item}
            onPress={() => router.push(`/clients/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  statBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statText: {
    fontWeight: "800",
    fontSize: 11,
  },
});