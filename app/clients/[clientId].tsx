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
      ? "#DCFCE7"
      : flash.type === "warn"
      ? "#FEF3C7"
      : "#FEE2E2";

  const border =
    flash.type === "ok"
      ? "#86EFAC"
      : flash.type === "warn"
      ? "#FCD34D"
      : "#FCA5A5";

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
          padding: 12,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontWeight: "900", color: THEME.text }}>
          {flash.title}
        </Text>
        {!!flash.message && (
          <Text style={{ marginTop: 2, color: THEME.text }}>{flash.message}</Text>
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
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          padding: 16,
        }}
      >
        {/* overlay atrás */}
        <Pressable
          onPress={onCancel}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View
          style={{
            width: "100%",
            maxWidth: 520,
            alignSelf: "center",
            backgroundColor: THEME.card,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 20,
            padding: 16,
            gap: 12,
          }}
        >
          <Text style={{ fontWeight: "900", fontSize: 18, color: THEME.text }}>
            {title}
          </Text>
          <Text style={{ color: THEME.muted, fontWeight: "700" }}>{message}</Text>

          <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
            <Pressable
              onPress={onCancel}
              style={{
                backgroundColor: THEME.primarySoft,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 999,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ fontWeight: "900", color: THEME.primary }}>
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={{
                backgroundColor: danger ? "#c1121f" : THEME.primary,
                borderRadius: 999,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ fontWeight: "900", color: "#fff" }}>
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

    // ✅ Web: modal propio
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
      <AppHeader title="Turnos" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          paddingBottom: 110, // ✅ para que no lo tape el footer
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 560, gap: 14 }}>
          <FlashBanner flash={flash} onClose={() => setFlash(null)} />

          {/* Card principal */}
          <View
            style={{
              backgroundColor: THEME.card,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 20,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: THEME.primary,
                textAlign:"center"
              }}
            >
              {client.name}
            </Text>

            {client.phone ? (
              <Text
                style={{
                  marginTop: 6,
                  fontWeight: "700",
                  color: THEME.muted,
                }}
              >
                📞 {client.phone}
              </Text>
            ) : null}
          </View>

          {/* Eliminar clienta */}
          <Pressable
            onPress={handleDeleteClient}
            disabled={isDeleting}
            style={{
              backgroundColor: "#ffe5ec",
              borderRadius: 18,
              paddingVertical: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#fecdd3",
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            <Text style={{ fontWeight: "900", color: "#c1121f" }}>
              {isDeleting ? "Eliminando..." : "Eliminar clienta"}
            </Text>
          </Pressable>

          {/* Historial */}
          <Text style={{ fontWeight: "900", fontSize: 16, color: THEME.text, textAlign:"center" }}>
            Historial de turnos
          </Text>

          {appointments.length === 0 ? (
            <Text style={{ color: THEME.muted, fontWeight: "700", textAlign:"center" }}>
              No tiene turnos todavía 💖
            </Text>
          ) : (
            appointments.map((it) => {
              const date = it.startAt?.toDate
                ? it.startAt.toDate()
                : new Date(it.startAt?.seconds * 1000);

              return (
                <Pressable
                  key={it.id}
                  onPress={() =>router.push({
  pathname: "/appointments/[appointmentId]",
  params: {
    appointmentId: it.id,
    from: "client",
    clientId,
    backTo: "/(tabs)/clients/[clientId]",
  },
} as any)}
                  style={{
                    backgroundColor: THEME.card,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 18,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontWeight: "900", color: THEME.primary }}>
                    {date.toLocaleDateString("es-AR")} -{" "}
                    {date.toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>

                  <Text
                    style={{
                      marginTop: 4,
                      fontWeight: "900",
                      color: it.canceled ? "#dc2626" : (it.paid ? THEME.success : THEME.warning),
                    }}
                  >
                    ${it.amount?.toLocaleString("es-AR")} •{" "}
                    {it.canceled ? "Cancelado ❌" : (it.paid ? "Pagado ✅" : "Pendiente ⏳")}
                  </Text>

                  {it.description ? (
                    <Text
                      style={{
                        marginTop: 4,
                        fontWeight: "700",
                        color: THEME.muted,
                      }}
                    >
                      {it.description}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ✅ Web confirm modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Eliminar clienta"
        message="Se eliminarán todos sus turnos. ¿Estás segura?"
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