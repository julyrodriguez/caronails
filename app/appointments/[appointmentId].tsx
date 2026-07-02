import React from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";

import AppHeader from "../src/components/AppHeader";
import { db } from "../src/lib/firebase";
import { useAccount } from "../src/hooks/useAccount";
import { THEME } from "../src/lib/theme";
import AppFooter from "../src/components/AppFooter";


import { scheduleAppointmentNotification, cancelNotification } from "../src/lib/notifications";

type Appointment = {
  id: string;
  startAt: any;
  amount?: number;
  paid?: boolean;
  canceled?: boolean;
  description?: string;
  clientNameSnapshot?: string;
};

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

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { accountId } = useAccount();
  const isWeb = Platform.OS === "web";

  // ✅ ahora leemos contexto de navegación
  const params = useLocalSearchParams<{
    appointmentId?: string;
    from?: string;

    // fallback de retorno
    backTo?: string;

    // para volver al día exacto del calendario
    dayKey?: string;

    // para volver a una clienta exacta
    clientId?: string;
  }>();

  const appointmentId =
    typeof params.appointmentId === "string" ? params.appointmentId : "";

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

  const [appointment, setAppointment] = React.useState<Appointment | null>(null);

  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [paid, setPaid] = React.useState(false);
  const [canceled, setCanceled] = React.useState(false);
  const [appointmentDate, setAppointmentDate] = React.useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // ✅ back inteligente: si hay historial, back. Si no, replace al fallback correcto.
  const smartBack = React.useCallback(() => {
    // 1) Intento: volver por historial
    // (en web a veces hay refresh y no existe history)
    try {
      router.back();
      return;
    } catch {}

    // 2) Fallback por params
    const backTo = typeof params.backTo === "string" ? params.backTo : "";

    if (backTo) {
      // volver a calendar/day con dayKey
      if (backTo === "/calendar/day") {
        router.replace(
          {
            pathname: backTo as any,
            params: { dayKey: params.dayKey },
          } as any
        );
        return;
      }

      // volver a clients/[clientId]
      if (
        backTo === "/(tabs)/clients/[clientId]" &&
        typeof params.clientId === "string"
      ) {
        router.replace(
          {
            pathname: backTo as any,
            params: { clientId: params.clientId },
          } as any
        );
        return;
      }

      // volver simple
      router.replace(backTo as any);
      return;
    }

    // 3) Último fallback
    router.replace("/(tabs)/calendar" as any);
  }, [router, params]);

  React.useEffect(() => {
    if (!appointmentId || !accountId) return;

    const ref = doc(db, "accounts", accountId, "appointments", appointmentId);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = {
          id: snap.id,
          ...(snap.data() as Omit<Appointment, "id">),
        };

        setAppointment(data);
        setAmount(String(data.amount ?? ""));
        setDescription(data.description ?? "");
        setPaid(!!data.paid);
        setCanceled(!!data.canceled);

        const date = data.startAt?.toDate
          ? data.startAt.toDate()
          : new Date(data.startAt?.seconds * 1000);
        setAppointmentDate(date);

        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [appointmentId, accountId]);

  async function saveChanges() {
    if (!appointment || isSaving) return;

    try {
      setIsSaving(true);

      const ref = doc(db, "accounts", accountId, "appointments", appointment.id);

      const dayKey = appointmentDate.toISOString().split("T")[0];
      const monthKey = `${appointmentDate.getFullYear()}-${String(
        appointmentDate.getMonth() + 1
      ).padStart(2, "0")}`;

      // Cancelar notificación anterior si existe
      const prevNotifId = (appointment as any).notificationId;
      if (prevNotifId && typeof prevNotifId === "string") {
        try {
          await cancelNotification(prevNotifId);
        } catch (_) {
          // Si falla la cancelación, no bloquear el guardado
        }
      }

      // Programar nueva notificación (solo si no está excluido)
      let newNotificationId: string | null = null;
      if (!(appointment as any).excludeFromNotifications) {
        const clientName = appointment.clientNameSnapshot || "Clienta";
        const result = await scheduleAppointmentNotification(
          appointment.id,
          clientName,
          appointmentDate
        );
        if (result.ok) {
          newNotificationId = result.notificationId;
        }
      }

      await updateDoc(ref, {
        amount: amount ? Number(amount) : 0,
        description,
        paid,
        canceled,
        startAt: Timestamp.fromDate(appointmentDate),
        dayKey,
        monthKey,
        notificationId: newNotificationId,
      });

      notify("ok", "Guardado", "Cambios actualizados 💅");
    } catch (e: any) {
      notify("err", "Error", e?.message ?? "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }

  function onDateChange(event: any, selectedDate?: Date) {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(appointmentDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setAppointmentDate(newDate);
    }
  }

  function onTimeChange(event: any, selectedTime?: Date) {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(appointmentDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setAppointmentDate(newDate);
    }
  }

  async function doDeleteAppointment() {
    if (!appointment || isDeleting) return;

    try {
      setIsDeleting(true);

      const ref = doc(db, "accounts", accountId, "appointments", appointment.id);
      await deleteDoc(ref);

      if (isWeb) notify("ok", "Eliminado", "Turno eliminado.");

      // ✅ al borrar, volver al lugar correcto
      smartBack();
    } catch (e: any) {
      notify("err", "Error", e?.message ?? "No se pudo eliminar el turno");
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  }

  function deleteAppointmentHandler() {
    if (!appointment) return;

    if (!isWeb) {
      Alert.alert("Eliminar turno", "¿Seguro querés eliminar este turno?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: doDeleteAppointment,
        },
      ]);
      return;
    }

    setConfirmOpen(true);
    scrollToTop();
  }

  if (!appointmentId) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <AppHeader title="Turnos" />
        <View style={{ padding: 20 }}>
          <Text>No se encontró el ID del turno.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <AppHeader title="Turnos" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <AppHeader title="Turnos" />
        <View style={{ padding: 20 }}>
          <Text>Este turno no existe o fue eliminado.</Text>
        </View>
      </View>
    );
  }

  const date = appointment.startAt?.toDate
    ? appointment.startAt.toDate()
    : new Date(appointment.startAt?.seconds * 1000);

  // ✅ elegir hacia dónde apunta el menú del footer según from/backTo
  const footerMenuHref =
    typeof params.backTo === "string"
      ? params.backTo
      : typeof params.from === "string" && params.from.startsWith("client")
      ? "/(tabs)/clients"
      : "/(tabs)/calendar";

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <AppHeader title="Editar Turno" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          paddingBottom: 110,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 560, gap: 14 }}>
          <FlashBanner flash={flash} onClose={() => setFlash(null)} />

          <View
            style={{
              backgroundColor: THEME.card,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 18,
              padding: 16,
            }}
          >
            <Text style={{ fontWeight: "900", color: THEME.primary, marginBottom: 6 }}>
              {appointment.clientNameSnapshot}
            </Text>

            <Text style={{ color: THEME.muted }}>
              {date.toLocaleDateString("es-AR")} -{" "}
              {date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>

          {/* FECHA Y HORA */}
          <Text style={{ fontWeight: "900", color: THEME.text, marginTop: 8 }}>
            Fecha y Hora del Turno
          </Text>

          {isWeb ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: THEME.muted, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
                  Fecha
                </Text>
                <TextInput
                  value={appointmentDate.toISOString().split('T')[0]}
                  onChangeText={(text) => {
                    const [year, month, day] = text.split('-').map(Number);
                    if (year && month && day) {
                      const newDate = new Date(appointmentDate);
                      newDate.setFullYear(year);
                      newDate.setMonth(month - 1);
                      newDate.setDate(day);
                      setAppointmentDate(newDate);
                    }
                  }}
                  placeholder="YYYY-MM-DD"
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.primary,
                    borderRadius: 14,
                    padding: 12,
                    backgroundColor: THEME.card,
                    color: THEME.text,
                    fontWeight: "900",
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: THEME.muted, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
                  Hora
                </Text>
                <TextInput
                  value={`${String(appointmentDate.getHours()).padStart(2, '0')}:${String(appointmentDate.getMinutes()).padStart(2, '0')}`}
                  onChangeText={(text) => {
                    const parts = text.split(':');
                    const hours = parseInt(parts[0], 10);
                    const minutes = parseInt(parts[1], 10);
                    if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                      const newDate = new Date(appointmentDate);
                      newDate.setHours(hours);
                      newDate.setMinutes(minutes);
                      setAppointmentDate(newDate);
                    }
                  }}
                  placeholder="HH:MM"
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.primary,
                    borderRadius: 14,
                    padding: 12,
                    backgroundColor: THEME.card,
                    color: THEME.text,
                    fontWeight: "900",
                  }}
                />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={{
                  flex: 1,
                  borderWidth: 2,
                  borderColor: THEME.primary,
                  borderRadius: 14,
                  padding: 12,
                  backgroundColor: THEME.primarySoft,
                }}
              >
                <Text style={{ color: THEME.primary, fontSize: 12, fontWeight: "700" }}>
                  📅 Fecha
                </Text>
                <Text style={{ color: THEME.text, fontWeight: "900", marginTop: 4 }}>
                  {appointmentDate.toLocaleDateString("es-AR")}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowTimePicker(true)}
                style={{
                  flex: 1,
                  borderWidth: 2,
                  borderColor: THEME.primary,
                  borderRadius: 14,
                  padding: 12,
                  backgroundColor: THEME.primarySoft,
                }}
              >
                <Text style={{ color: THEME.primary, fontSize: 12, fontWeight: "700" }}>
                  🕐 Hora
                </Text>
                <Text style={{ color: THEME.text, fontWeight: "900", marginTop: 4 }}>
                  {appointmentDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </Pressable>
            </View>
          )}

          {!isWeb && showDatePicker && (
            <DateTimePicker
              value={appointmentDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {!isWeb && showTimePicker && (
            <DateTimePicker
              value={appointmentDate}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          {/* MONTO */}
          <Text style={{ fontWeight: "900", color: THEME.text }}>Monto</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 14,
              padding: 12,
              backgroundColor: THEME.card,
              color: THEME.text,
            }}
          />

          {/* DESCRIPCIÓN */}
          <Text style={{ fontWeight: "900", color: THEME.text }}>Descripción</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            style={{
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 14,
              padding: 12,
              minHeight: 80,
              textAlignVertical: "top",
              backgroundColor: THEME.card,
              color: THEME.text,
            }}
          />

          {/* ESTADO DEL TURNO */}
          <Text style={{ fontWeight: "900", color: THEME.text, marginTop: 8 }}>
            Estado del Turno
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* PAGADO */}
            <Pressable
              onPress={() => {
                if (!canceled) {
                  setPaid((p) => !p);
                }
              }}
              disabled={canceled}
              style={{
                flex: 1,
                backgroundColor: canceled ? "#f3f4f6" : (paid ? "#DCFCE7" : "#FEF3C7"),
                borderWidth: 1,
                borderColor: canceled ? "#d1d5db" : (paid ? "#86EFAC" : "#FCD34D"),
                borderRadius: 999,
                padding: 12,
                alignItems: "center",
                opacity: canceled ? 0.5 : 1,
              }}
            >
              <Text style={{ fontWeight: "900", color: canceled ? "#6b7280" : (paid ? THEME.success : THEME.warning) }}>
                {paid ? "Pagado ✅" : "Pendiente ⏳"}
              </Text>
            </Pressable>

            {/* CANCELADO */}
            <Pressable
              onPress={() => setCanceled((c) => !c)}
              style={{
                flex: 1,
                backgroundColor: canceled ? "#FEE2E2" : "#f3f4f6",
                borderWidth: 1,
                borderColor: canceled ? "#FCA5A5" : "#d1d5db",
                borderRadius: 999,
                padding: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", color: canceled ? "#dc2626" : "#6b7280" }}>
                {canceled ? "Cancelado ❌" : "Activo"}
              </Text>
            </Pressable>
          </View>

          {/* GUARDAR */}
          <Pressable
            onPress={saveChanges}
            disabled={isSaving}
            style={{
              backgroundColor: isSaving ? THEME.border : THEME.primary,
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Text>
          </Pressable>

          {/* BORRAR */}
          <Pressable
            onPress={deleteAppointmentHandler}
            disabled={isDeleting}
            style={{
              backgroundColor: "#ffe5ec",
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#c1121f", fontWeight: "900" }}>
              {isDeleting ? "Borrando..." : "Borrar turno"}
            </Text>
          </Pressable>

          {/* ✅ VOLVER (por si querés un botón dentro del contenido también) */}
          <Pressable
            onPress={smartBack}
            style={{
              backgroundColor: THEME.primarySoft,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: THEME.primary, fontWeight: "900" }}>Volver</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ✅ Web confirm */}
      <ConfirmModal
        open={confirmOpen}
        title="Eliminar turno"
        message="¿Seguro querés eliminar este turno?"
        confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
        cancelText="Cancelar"
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doDeleteAppointment}
      />

      {/* ✅ Footer usando smartBack */}
      <AppFooter
        menuHref={footerMenuHref as any}
        
        onBack={smartBack as any}
      />
    </View>
  );
}