// src/components/ClientPicker.tsx
import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAccount } from "../hooks/useAccount";
import { useClientsSearch, Client } from "../hooks/useClients";
import { normalizeText } from "../lib/normalize";
import { THEME } from "../lib/theme";

export default function ClientPicker({
  value,
  onChange,
}: {
  value: { clientId: string; clientName: string } | null;
  onChange: (v: { clientId: string; clientName: string }) => void;
}) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const { items } = useClientsSearch(q);

  return (
    <View style={{ gap: 8, alignItems: "stretch", width: "100%" }}>
      <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 14, paddingLeft: 4 }}>
        Clienta
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          width: "100%",
          borderWidth: 1,
          borderColor: value ? THEME.primary : THEME.border,
          backgroundColor: value ? THEME.primarySoft : THEME.card,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: pressed ? 0.9 : 1,
          transform: pressed ? [{ scale: 0.99 }] : [{ scale: 1 }],
          shadowColor: THEME.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: value ? 0.1 : 0.04,
          shadowRadius: 10,
        })}
      >
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontWeight: "900",
              color: value ? THEME.text : THEME.muted,
              fontSize: 16,
            }}
          >
            {value ? value.clientName : "Seleccionar clienta…"}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 11, color: THEME.muted, fontWeight: "600" }}>
            {value ? "Tocá para cambiar de clienta" : "Tocá para buscar o crear una nueva"}
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: THEME.primary, fontWeight: "900" }}>
          {value ? "✓" : "＋"}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType={Platform.OS === "web" ? "fade" : "slide"}
        onRequestClose={() => setOpen(false)}
      >
        <PickerModal
          q={q}
          setQ={setQ}
          items={items}
          onPick={(c) => {
            onChange({ clientId: c.id, clientName: c.name });
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      </Modal>
    </View>
  );
}

function PickerModal({
  q,
  setQ,
  items,
  onPick,
  onClose,
}: {
  q: string;
  setQ: (s: string) => void;
  items: Client[];
  onPick: (c: Client) => void;
  onClose: () => void;
}) {
  const { accountId } = useAccount();
  const canCreate = normalizeText(q).length >= 2;

  async function createClient() {
    try {
      const name = q.trim();
      if (name.length < 2) return;

      const ref = collection(db, "accounts", accountId, "clients");
      const docRef = await addDoc(ref, {
        name,
        nameLower: normalizeText(name),
        createdAt: serverTimestamp(),
      });

      onPick({ id: docRef.id, name, nameLower: normalizeText(name) });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo crear la clienta");
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(46, 30, 47, 0.4)", // Plum overlay
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Overlay click to close */}
      <Pressable
        onPress={onClose}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Sheet Container */}
      <View
        style={{
          width: "100%",
          maxWidth: 500,
          alignSelf: "center",
          backgroundColor: THEME.card,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: THEME.border,
          padding: 20,
          gap: 14,
          shadowColor: "#2E1E2F",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "900", color: THEME.text }}>
            Seleccionar Clienta
          </Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: THEME.border,
              backgroundColor: THEME.primarySoft,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontWeight: "900", color: THEME.primary, fontSize: 13 }}>
              Cerrar
            </Text>
          </Pressable>
        </View>

        {/* Buscador */}
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Escribe el nombre de la clienta…"
          placeholderTextColor={THEME.muted}
          autoFocus
          style={{
            backgroundColor: THEME.bg,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 14,
            fontWeight: "700",
            color: THEME.text,
            fontSize: 15,
          }}
        />

        {/* Crear nueva */}
        {canCreate ? (
          <Pressable
            onPress={createClient}
            style={({ pressed }) => ({
              backgroundColor: THEME.primary,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              shadowColor: THEME.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.16,
              shadowRadius: 8,
            })}
          >
            <Text style={{ fontWeight: "900", color: "#fff", textAlign: "center", fontSize: 14 }}>
              ＋ Crear clienta: “{q.trim()}”
            </Text>
          </Pressable>
        ) : (
          <Text style={{ color: THEME.muted, fontSize: 11, fontWeight: "600", paddingLeft: 4 }}>
            Tip: escribe al menos 2 letras para poder crear una clienta nueva.
          </Text>
        )}

        {/* Lista */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "rgba(233, 210, 220, 0.4)",
            paddingTop: 10,
          }}
        >
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            style={{ maxHeight: 280 }}
            ListEmptyComponent={
              <Text
                style={{
                  color: THEME.muted,
                  textAlign: "center",
                  paddingVertical: 24,
                  fontWeight: "700",
                }}
              >
                No hay resultados
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPick(item)}
                style={({ pressed }) => ({
                  borderWidth: 1,
                  borderColor: pressed ? THEME.primary : THEME.border,
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: pressed ? THEME.primarySoft : THEME.card,
                })}
              >
                <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 15 }}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </View>
  );
}