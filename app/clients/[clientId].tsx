import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";

import AppHeader from "../src/components/AppHeader";
import { THEME } from "../src/lib/theme";
import { db } from "../src/lib/firebase";
import { useAccount } from "../src/hooks/useAccount";
import { useClientAppointments } from "../src/hooks/useClientAppointments";
import { deleteClientCascade } from "../src/hooks/useClients";

import AppFooter from "../src/components/AppFooter";

type Flash = { type: "ok" | "err" | "warn"; title: string; message?: string };

function FlashBanner({
  flash,
  onClose,
}: {
  flash: Flash | null;
  onClose: () => void;
}) {
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!flash) return;

    Animated.timing(anim, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();

    const t = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(({ finished }) => finished && onClose());
    }, 2400);

    return () => clearTimeout(t);
  }, [flash, anim, onClose]);

  if (!flash) return null;

  const bg =
    flash.type === "ok"
      ? "#ECFDF5"
      : flash.type === "warn"
      ? "#FFFBEB"
      : "#FEF2F2";

  const border =
    flash.type === "ok"
      ? "#A7F3D0"
      : flash.type === "warn"
      ? "#FDE68A"
      : "#FCA5A5";

  const textColor =
    flash.type === "ok"
      ? THEME.success
      : flash.type === "warn"
      ? THEME.exam
      : "#DC2626";

  return (
    <Animated.View
      style={{
        width: "100%",
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-8, 0],
            }),
          },
        ],
      }}
    >
      <Pressable
        onPress={onClose}
        style={{
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontWeight: "900", color: textColor, fontSize: 14 }}>
          {flash.title}
        </Text>
        {!!flash.message && (
          <Text style={{ marginTop: 2, color: THEME.text, fontSize: 13, fontWeight: "600" }}>
            {flash.message}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(46, 30, 47, 0.45)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Pressable
          onPress={onCancel}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View
          style={{
            width: "100%",
            maxWidth: 460,
            alignSelf: "center",
            backgroundColor: THEME.card,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 24,
            padding: 20,
            gap: 14,
            shadowColor: "#2E1E2F",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.16,
            shadowRadius: 20,
          }}
        >
          <Text style={{ fontWeight: "900", fontSize: 18, color: THEME.text }}>
            {title}
          </Text>
          <Text style={{ color: THEME.muted, fontWeight: "700", fontSize: 14, lineHeight: 20 }}>
            {message}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => ({
                backgroundColor: THEME.primarySoft,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 16,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontWeight: "900", color: THEME.primary, fontSize: 13 }}>
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                backgroundColor: danger ? "#DC2626" : THEME.primary,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 16,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontWeight: "900", color: "#fff", fontSize: 13 }}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ClientDetailScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { accountId } = useAccount();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const scrollRef = React.useRef<ScrollView>(null);
  const scrollToTop = React.useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const [flash, setFlash] = React.useState<Flash | null>(null);

  const notify = React.useCallback(
    (type: Flash["type"], title: string, message?: string) => {
      if (isWeb) {
        setFlash({ type, title, message });
        scrollToTop();
        return;
      }
      Alert.alert(title, message);
    },
    [isWeb, scrollToTop]
  );

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [client, setClient] = React.useState<any | null>(null);

  // Turnos de esta clienta
  const { items: appointments } = useClientAppointments(String(clientId));

  React.useEffect(() => {
    if (!clientId || !accountId) return;

    const ref = doc(db, "accounts", accountId, "clients", String(clientId));

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setClient(null);
        return;
      }
      setClient({ id: snap.id, ...snap.data() });
    });

    return () => unsub();
  }, [clientId, accountId]);

  async function doDeleteClient() {
    if (!client?.id) return;
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await deleteClientCascade(accountId, client.id);
      if (isWeb) {
        notify("ok", "Eliminada", "Clienta eliminada correctamente.");
      }
      router.replace("/(tabs)/clients");
    } catch (e: any) {
      notify("err", "Error", e?.message ?? "No se pudo eliminar");
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  }

  function handleDeleteClient() {
    if (!client) return;

    if (!isWeb) {
      Alert.alert(
        "Eliminar clienta",
        "Se eliminarán todos sus turnos. ¿Estás segura?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: doDeleteClient,
          },
        ]
      );
      return;
    }

    setConfirmOpen(true);
    scrollToTop();
  }

  if (!client) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <AppHeader title="Turnos" />
        <AppFooter showMenu menuHref="/(tabs)/clients" showBack />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <AppHeader title="Turnos de Clienta" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          paddingBottom: 120,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 520, gap: 14 }}>
          <FlashBanner flash={flash} onClose={() => setFlash(null)} />

          {/* Client summary card */}
          <View
            style={{
              backgroundColor: THEME.card,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 22,
              padding: 20,
              alignItems: "center",
              shadowColor: "#2E1E2F",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.03,
              shadowRadius: 10,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "900",
                color: THEME.text,
                textAlign: "center"
              }}
            >
              {client.name}
            </Text>
          </View>

          {/* Delete client button */}
          <Pressable
            onPress={handleDeleteClient}
            disabled={isDeleting}
            style={({ pressed }) => ({
              backgroundColor: "#FEF2F2",
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(220,38,38,0.2)",
              opacity: (isDeleting || pressed) ? 0.8 : 1,
            })}
          >
            <Text style={{ fontWeight: "900", color: "#DC2626", fontSize: 14 }}>
              {isDeleting ? "Eliminando..." : "Eliminar Clienta y Historial"}
            </Text>
          </Pressable>

          {/* History Header */}
          <Text style={{ fontWeight: "900", fontSize: 15, color: THEME.text, textAlign: "left", paddingLeft: 4, marginTop: 10 }}>
            Historial de Turnos
          </Text>

          {appointments.length === 0 ? (
            <View
              style={{
                backgroundColor: THEME.card,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 20,
                padding: 30,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 22, marginBottom: 8 }}>🌸</Text>
              <Text style={{ color: THEME.muted, fontWeight: "700", textAlign: "center", fontSize: 14 }}>
                No tiene turnos registrados todavía 💖
              </Text>
            </View>
          ) : (
            appointments.map((it) => {
              const date = it.startAt?.toDate
                ? it.startAt.toDate()
                : new Date(it.startAt?.seconds * 1000);

              return (
                <Pressable
                  key={it.id}
                  onPress={() => router.push({
                    pathname: "/appointments/[appointmentId]",
                    params: {
                      appointmentId: it.id,
                      from: "client",
                      clientId,
                      backTo: "/(tabs)/clients/[clientId]",
                    },
                  } as any)}
                  style={({ pressed }) => ({
                    backgroundColor: THEME.card,
                    borderWidth: 1,
                    borderColor: it.canceled ? "rgba(220,38,38,0.2)" : THEME.border,
                    borderRadius: 18,
                    padding: 16,
                    opacity: pressed ? 0.94 : 1,
                    shadowColor: "#2E1E2F",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.02,
                    shadowRadius: 6,
                  })}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 14 }}>
                      📅 {date.toLocaleDateString("es-AR")} -{" "}
                      {date.toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>

                    <View
                      style={{
                        backgroundColor: it.canceled
                          ? "#FEF2F2"
                          : it.paid
                          ? "#ECFDF5"
                          : THEME.examSoft,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "900",
                          color: it.canceled
                            ? "#EF4444"
                            : it.paid
                            ? THEME.success
                            : THEME.exam,
                        }}
                      >
                        {it.canceled ? "Cancelado" : it.paid ? "Pagado" : "Pendiente"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      {it.description ? (
                        <Text style={{ color: THEME.muted, fontWeight: "600", fontSize: 13 }} numberOfLines={1}>
                          {it.description}
                        </Text>
                      ) : (
                        <Text style={{ color: THEME.muted, fontStyle: "italic", fontSize: 12, fontWeight: "500" }}>
                          Sin notas
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontWeight: "900", color: THEME.primary, fontSize: 15 }}>
                      ${it.amount?.toLocaleString("es-AR")}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        open={confirmOpen}
        title="Eliminar Clienta"
        message="Se eliminarán todos sus turnos. ¿Estás segura de eliminar permanentemente a esta clienta?"
        confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
        cancelText="Cancelar"
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doDeleteClient}
      />

      <AppFooter showMenu menuHref="/(tabs)/clients" showBack />
    </View>
  );
}