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
          backgroundColor: "rgba(46, 30, 47, 0.45)", // Plum overlay
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

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { accountId } = useAccount();
  const isWeb = Platform.OS === "web";

  const params = useLocalSearchParams<{
    appointmentId?: string;
    from?: string;
    backTo?: string;
    dayKey?: string;
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

  const smartBack = React.useCallback(() => {
    try {
      router.back();
      return;
    } catch {}

    const backTo = typeof params.backTo === "string" ? params.backTo : "";

    if (backTo) {
      if (backTo === "/calendar/day" || backTo === "calendar/day") {
        router.replace({
          pathname: "/(tabs)/calendar/day",
          params: { dayKey: params.dayKey },
        } as any);
        return;
      }

      if (
        (backTo === "/(tabs)/clients/[clientId]" || backTo === "clients/[clientId]") &&
        typeof params.clientId === "string"
      ) {
        router.replace({
          pathname: "/clients/[clientId]" as any,
          params: { clientId: params.clientId },
        } as any);
        return;
      }

      router.replace(backTo as any);
      return;
    }

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

      // Cancel previous notification if exists
      const prevNotifId = (appointment as any).notificationId;
      if (prevNotifId && typeof prevNotifId === "string") {
        try {
          await cancelNotification(prevNotifId);
        } catch (_) {}
      }

      // Schedule new notification on mobile
      let newNotificationId: string | null = null;
      if (Platform.OS !== "web" && !(appointment as any).excludeFromNotifications) {
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

      notify("ok", "Guardado", "Cambios actualizados correctamente 💅");
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
      <View style={{ flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === "ios" ? 44 : 20 }}>
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: THEME.muted, fontWeight: "700" }}>No se encontró el ID del turno.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === "ios" ? 44 : 20 }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={THEME.primary} />
        </View>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === "ios" ? 44 : 20 }}>
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: THEME.muted, fontWeight: "700" }}>Este turno no existe o fue eliminado.</Text>
        </View>
      </View>
    );
  }

  const footerMenuHref =
    typeof params.backTo === "string"
      ? params.backTo
      : typeof params.from === "string" && params.from.startsWith("client")
      ? "/(tabs)/clients"
      : "/(tabs)/calendar";

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === "ios" ? 44 : 20 }}>

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
        <View style={{ width: "100%", maxWidth: 520, gap: 14 }}>
          <FlashBanner flash={flash} onClose={() => setFlash(null)} />

          {/* Service detail card */}
          <View
            style={{
              backgroundColor: THEME.card,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 22,
              padding: 20,
              shadowColor: "#2E1E2F",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
            }}
          >
            <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 20, textAlign: "center" }}>
              {appointment.clientNameSnapshot}
            </Text>

            <Text style={{ color: THEME.muted, fontWeight: "700", textAlign: "center", marginTop: 4, fontSize: 14 }}>
              Cita agendada: {appointmentDate.toLocaleDateString("es-AR")} -{" "}
              {appointmentDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>

          {/* Date and Time Fields */}
          <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 14, paddingLeft: 4 }}>
            Fecha y Hora de la Cita
          </Text>

          {isWeb ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: THEME.muted, fontSize: 11, fontWeight: "700", marginBottom: 4, paddingLeft: 2 }}>
                  Fecha
                </Text>
                <TextInput
                  // @ts-ignore
                  type="date"
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
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 14,
                    padding: 12,
                    backgroundColor: THEME.card,
                    color: THEME.text,
                    fontWeight: "700",
                    fontSize: 15,
                    textAlign: "center",
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: THEME.muted, fontSize: 11, fontWeight: "700", marginBottom: 4, paddingLeft: 2 }}>
                  Hora
                </Text>
                <TextInput
                  // @ts-ignore
                  type="time"
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
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 14,
                    padding: 12,
                    backgroundColor: THEME.card,
                    color: THEME.text,
                    fontWeight: "700",
                    fontSize: 15,
                    textAlign: "center",
                  }}
                />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={({ pressed }) => ({
                  flex: 1,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 14,
                  padding: 12,
                  backgroundColor: THEME.primarySoft,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{ color: THEME.primary, fontSize: 11, fontWeight: "800" }}>
                  📅 Fecha
                </Text>
                <Text style={{ color: THEME.text, fontWeight: "900", marginTop: 4, fontSize: 15 }}>
                  {appointmentDate.toLocaleDateString("es-AR")}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowTimePicker(true)}
                style={({ pressed }) => ({
                  flex: 1,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 14,
                  padding: 12,
                  backgroundColor: THEME.primarySoft,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{ color: THEME.primary, fontSize: 11, fontWeight: "800" }}>
                  🕐 Hora
                </Text>
                <Text style={{ color: THEME.text, fontWeight: "900", marginTop: 4, fontSize: 15 }}>
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

          {/* Amount input */}
          <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 14, paddingLeft: 4 }}>
            Monto ($)
          </Text>
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
              fontWeight: "700",
              fontSize: 15,
            }}
          />

          {/* Description notes */}
          <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 14, paddingLeft: 4 }}>
            Descripción del Servicio
          </Text>
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
              fontWeight: "600",
              fontSize: 14,
            }}
          />

          {/* Switches for state */}
          <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 14, paddingLeft: 4, marginTop: 4 }}>
            Estado de la Cita
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Paid status switch */}
            <Pressable
              onPress={() => {
                if (!canceled) setPaid((p) => !p);
              }}
              disabled={canceled}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: canceled ? "#F3F4F6" : (paid ? "#ECFDF5" : THEME.examSoft),
                borderWidth: 1,
                borderColor: canceled ? "#D1D5DB" : (paid ? "rgba(92,168,133,0.3)" : THEME.examBorder),
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                opacity: (canceled || pressed) ? 0.8 : 1,
              })}
            >
              <Text style={{ fontWeight: "900", color: canceled ? "#9CA3AF" : (paid ? THEME.success : THEME.exam), fontSize: 14 }}>
                {paid ? "Cobrado ✓" : "Impago ⏳"}
              </Text>
            </Pressable>

            {/* Cancel state switch */}
            <Pressable
              onPress={() => setCanceled((c) => !c)}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: canceled ? "#FEF2F2" : "#F3F4F6",
                borderWidth: 1,
                borderColor: canceled ? "rgba(220,38,38,0.2)" : "#D1D5DB",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontWeight: "900", color: canceled ? "#DC2626" : "#4B5563", fontSize: 14 }}>
                {canceled ? "Cancelado ❌" : "Activo"}
              </Text>
            </Pressable>
          </View>

          {/* Save button */}
          <Pressable
            onPress={saveChanges}
            disabled={isSaving}
            style={({ pressed }) => ({
              backgroundColor: isSaving ? THEME.border : THEME.primary,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              opacity: (isSaving || pressed) ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              shadowColor: THEME.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.16,
              shadowRadius: 10,
              marginTop: 8,
            })}
          >
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Text>
          </Pressable>

          {/* Action Row: Delete & Back */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Delete button */}
            <Pressable
              onPress={deleteAppointmentHandler}
              disabled={isDeleting}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: "#FEF2F2",
                borderWidth: 1,
                borderColor: "rgba(220,38,38,0.2)",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                opacity: (isDeleting || pressed) ? 0.8 : 1,
              })}
            >
              <Text style={{ color: "#DC2626", fontWeight: "900", fontSize: 14 }}>
                {isDeleting ? "Borrando..." : "Eliminar Cita"}
              </Text>
            </Pressable>

            {/* Return button */}
            <Pressable
              onPress={smartBack}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: THEME.primarySoft,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: THEME.primary, fontWeight: "900", fontSize: 14 }}>Volver</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Web confirm dialog */}
      <ConfirmModal
        open={confirmOpen}
        title="Eliminar Turno"
        message="¿Estás completamente segura de eliminar esta cita? Esta acción no se puede deshacer."
        confirmText={isDeleting ? "Borrando..." : "Eliminar"}
        cancelText="Cancelar"
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doDeleteAppointment}
      />

      <AppFooter
        showBack
        backHref={footerMenuHref as any}
      />
    </View>
  );
}