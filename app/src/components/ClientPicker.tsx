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
    <View style={{ gap: 10, alignItems: "center" }}>
      <Text style={{ fontWeight: "900", color: THEME.text, textAlign: "center" }}>
        Clienta
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          width: "100%",
          borderWidth: 1,
          borderColor: THEME.border,
          backgroundColor: THEME.primarySoft,
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 14,
          alignItems: "center",
          opacity: pressed ? 0.9 : 1,
          transform: pressed ? [{ scale: 0.99 }] : [{ scale: 1 }],
        })}
      >
        <Text
          numberOfLines={1}
          style={{
            fontWeight: "900",
            color: value ? THEME.primary : THEME.muted,
            textAlign: "center",
          }}
        >
          {value ? value.clientName : "Elegir clienta…"}
        </Text>

        <Text style={{ marginTop: 2, fontSize: 12, color: THEME.muted }}>
          Tocá para buscar o crear
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
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* ✅ Overlay atrás: cierra tocando afuera */}
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

      {/* ✅ Sheet arriba: recibe los toques */}
      <View
        style={{
          width: "100%",
          maxWidth: 560,
          alignSelf: "center",
          backgroundColor: THEME.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: THEME.border,
          padding: 14,
          gap: 12,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "900", color: THEME.text }}>
            Elegir clienta
          </Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: THEME.border,
              backgroundColor: THEME.primarySoft,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ fontWeight: "900", color: THEME.primary }}>
              Cerrar
            </Text>
          </Pressable>
        </View>

        {/* Buscador */}
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar por nombre…"
          placeholderTextColor={THEME.muted}
          autoFocus
          style={{
            backgroundColor: THEME.card,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 12,
            fontWeight: "900",
            color: THEME.text,
          }}
        />

        {/* Crear nueva */}
        {canCreate ? (
          <Pressable
            onPress={createClient}
            style={({ pressed }) => ({
              backgroundColor: THEME.primary,
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 12,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ fontWeight: "900", color: "#fff", textAlign: "center" }}>
              + Nueva clienta: “{q.trim()}”
            </Text>
          </Pressable>
        ) : (
          <Text style={{ color: THEME.muted, fontSize: 12 }}>
            Tip: escribí al menos 2 letras para crear una nueva.
          </Text>
        )}

        {/* Lista */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: THEME.border,
            paddingTop: 12,
          }}
        >
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            style={{ maxHeight: 380 }}
            ListEmptyComponent={
              <Text
                style={{
                  color: THEME.muted,
                  textAlign: "center",
                  paddingVertical: 18,
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
                  borderColor: THEME.border,
                  borderRadius: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  backgroundColor: pressed ? THEME.primarySoft : THEME.card,
                })}
              >
                <Text style={{ fontWeight: "900", color: THEME.text }}>
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