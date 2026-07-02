import React from "react";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { useRouter } from "expo-router";

import AppHeader from "../src/components/AppHeader";
import { THEME } from "../src/lib/theme";
import { useClientsSearch } from "../src/hooks/useClients";

export default function ClientsScreen() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const { items } = useClientsSearch(q);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <AppHeader title="Clientas" />

      {/* Search box – fixed at top */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <View
          style={{
            backgroundColor: THEME.card,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 18,
            padding: 14,
          }}
        >
          <Text style={{ fontWeight: "900", color: THEME.text, marginBottom: 8, textAlign: "center" }}>Buscar</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Escriba el nombre de su clienta"
            placeholderTextColor={THEME.muted}
            style={{
              backgroundColor: THEME.primarySoft,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 14,
              padding: 12,
              fontWeight: "800",
              color: THEME.text,
              textAlign: "center",
            }}
          />
        </View>
      </View>

      {/* Client list – scrollable, flex:1 fills remaining space */}
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/clients/${item.id}`)}
            style={{
              backgroundColor: THEME.card,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 18,
              padding: 14,
            }}
          >
            <Text
              style={{
                fontWeight: "900",
                color: THEME.text,
                fontSize: 16,
                textAlign: "center",
              }}
            >
              {item.name}
            </Text>
            {item.phone ? (
              <Text style={{ color: THEME.muted, marginTop: 4 }}>{item.phone}</Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}