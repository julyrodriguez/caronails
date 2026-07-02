import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  getDocs,
  query,
  where,
  limit,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useLocalSearchParams } from "expo-router";
import * as Notifications from "expo-notifications";

import AppHeader from "../src/components/AppHeader";
import ClientPicker from "../src/components/ClientPicker";
import { THEME } from "../src/lib/theme";
import { db } from "../src/lib/firebase";
import { useAccount } from "../src/hooks/useAccount";
import { dayKeyFromDate, monthKeyFromDate } from "../src/lib/keys";
import {
  scheduleAppointmentNotification,
  requestNotificationPermissions,
} from "../src/lib/notifications";

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatYMD(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatTimeHM(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseYMD(s: string): Date | null {
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const yy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);

  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd)
    return null;

  return d;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        width: "100%",
        backgroundColor: THEME.card,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 22,
        padding: 16,
        shadowColor: "#2E1E2F",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      }}
    >
      {children}
    </View>
  );
}

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
      ? "#ECFDF5" // sage bg
      : flash.type === "warn"
      ? "#FFFBEB" // amber bg
      : "#FEF2F2"; // red bg

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

function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 30,
        bounciness: 0,
      }),
      Animated.timing(opacity, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 6,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const isSecondary = variant === "secondary";

  return (
    <Animated.View style={{ width: "100%", transform: [{ scale }], opacity }}>
      <Pressable
        disabled={!!disabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={{
          backgroundColor: disabled
            ? THEME.border
            : isSecondary
            ? THEME.primarySoft
            : THEME.primary,
          borderRadius: 16,
          paddingVertical: 14,
          alignItems: "center",
          borderWidth: isSecondary ? 1 : 0,
          borderColor: isSecondary ? THEME.border : "transparent",
          shadowColor: isSecondary ? "transparent" : THEME.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isSecondary ? 0 : 0.16,
          shadowRadius: 10,
        }}
      >
        <Text
          style={{
            color: isSecondary ? THEME.primary : "#fff",
            fontWeight: "900",
            fontSize: 16,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function AppointmentsScreen() {
  const { accountId } = useAccount();
  const isWeb = Platform.OS === "web";
  const params = useLocalSearchParams<{ date?: string }>();

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

  const [client, setClient] = React.useState<{
    clientId: string;
    clientName: string;
  } | null>(null);

  const [start, setStart] = React.useState(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d;
  });

  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [paid, setPaid] = React.useState(false);

  const [showDate, setShowDate] = React.useState(false);
  const [showTime, setShowTime] = React.useState(false);

  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!params?.date) return;

    const d = parseYMD(params.date);
    if (!d) return;

    const next = new Date(start);
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    next.setSeconds(0, 0);

    setStart(next);
    scrollToTop();
  }, [params?.date]);

  const quickHours = [
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
  ];

  const handleClientChange = React.useCallback(
    (c: { clientId: string; clientName: string } | null) => {
      setClient(c);
      scrollToTop();
    },
    [scrollToTop]
  );

  function setStartDateOnly(selected: Date) {
    const d = new Date(start);
    d.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );
    setStart(d);
  }

  function applyQuickDate(daysAdd: number) {
    const base = new Date();
    base.setHours(start.getHours(), start.getMinutes(), 0, 0);
    base.setDate(base.getDate() + daysAdd);
    setStart(base);
  }

  function addMinutesToStart(mins: number) {
    const d = new Date(start);
    d.setMinutes(d.getMinutes() + mins, 0, 0);
    setStart(d);
  }

  async function createAppointment() {
    Keyboard.dismiss();
    if (isSaving) return;

    try {
      if (!client) {
        notify("warn", "Falta clienta", "Elegí o creá una clienta.");
        return;
      }

      if (!accountId) {
        notify("err", "Error", "No se encontró la cuenta actual.");
        return;
      }

      if (start.getDay() === 0) {
        notify(
          "warn",
          "Domingo cerrado",
          "No se pueden crear turnos los domingos. Elegí otro día."
        );
        return;
      }

      setIsSaving(true);

      const ref = collection(db, "accounts", accountId, "appointments");
      const startTs = Timestamp.fromDate(start);

      // Check double booking
      const qCheck = query(ref, where("startAt", "==", startTs), limit(1));
      const snap = await getDocs(qCheck);

      if (!snap.empty) {
        notify(
          "warn",
          "Hora ocupada",
          `Ya existe un turno el ${fmtDate(start)} a las ${fmtTime(start)}.`
        );
        return;
      }

      const docRef = await addDoc(ref, {
        clientId: client.clientId,
        clientNameSnapshot: client.clientName,
        startAt: startTs,
        amount: amount ? Number(amount) : 0,
        description: description || "",
        paid,
        dayKey: dayKeyFromDate(start),
        monthKey: monthKeyFromDate(start),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Schedule local notification on mobile
      if (Platform.OS !== "web") {
        try {
          const notificationResult = await scheduleAppointmentNotification(
            docRef.id,
            client.clientName,
            start
          );

          if (notificationResult.ok) {
            await updateDoc(
              doc(db, "accounts", accountId, "appointments", docRef.id),
              {
                notificationId: notificationResult.notificationId,
                notificationStatus: "scheduled",
              }
            );
          } else {
            await updateDoc(
              doc(db, "accounts", accountId, "appointments", docRef.id),
              {
                notificationStatus: "failed",
                notificationError: notificationResult.reason,
                notificationErrorMessage: notificationResult.message,
              }
            );
            notify(
              "warn",
              "Turno creado sin recordatorio",
              notificationResult.message
            );
          }
        } catch (notificationError) {
          console.log("El turno se guardó, pero falló la notificación:", notificationError);
        }
      }

      notify("ok", "Listo", "Turno agendado correctamente 💖");

      setClient(null);
      setAmount("");
      setDescription("");
      setPaid(false);
      scrollToTop();
    } catch (e: any) {
      notify("err", "Error", e?.message ?? "No se pudo crear el turno");
    } finally {
      setIsSaving(false);
    }
  }

  const Content = (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 80,
        alignItems: "center",
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: "100%", maxWidth: 520, gap: 14 }}>
        <FlashBanner flash={flash} onClose={() => setFlash(null)} />

        {/* Client selector */}
        <Card>
          <ClientPicker value={client} onChange={handleClientChange} />
        </Card>

        {/* Date Selector */}
        <Card>
          <Text
            style={{
              fontWeight: "900",
              color: THEME.text,
              fontSize: 14,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Fecha del Turno
          </Text>

          {!isWeb ? (
            <>
              <Pressable
                onPress={() => setShowDate(true)}
                style={({ pressed }) => ({
                  backgroundColor: THEME.primarySoft,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 14,
                  padding: 12,
                  justifyContent: "center",
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text
                  style={{
                    fontWeight: "900",
                    color: THEME.primary,
                    textAlign: "center",
                    fontSize: 15,
                  }}
                >
                  {fmtDate(start)}
                </Text>
              </Pressable>

              {showDate && (
                <DateTimePicker
                  value={start}
                  mode="date"
                  onChange={(event: DateTimePickerEvent, selected?: Date) => {
                    setShowDate(false);
                    if (!selected) return;
                    setStartDateOnly(selected);
                  }}
                />
              )}
            </>
          ) : (
            <>
              {/* Quick shortcuts on web */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                {[
                  { label: "Hoy", days: 0 },
                  { label: "Mañana", days: 1 },
                  { label: "+2 días", days: 2 },
                  { label: "+3 días", days: 3 },
                  { label: "+7 días", days: 7 },
                ].map((b) => (
                  <Pressable
                    key={b.label}
                    onPress={() => applyQuickDate(b.days)}
                    style={({ pressed }) => ({
                      backgroundColor: THEME.primarySoft,
                      borderRadius: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      justifyContent: "center",
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontWeight: "800",
                        color: THEME.primary,
                        fontSize: 12,
                        textAlign: "center",
                      }}
                    >
                      {b.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* HTML5 Date Input on Web */}
              <TextInput
                // @ts-ignore
                type="date"
                value={formatYMD(start)}
                onChangeText={(t) => {
                  const parsed = parseYMD(t);
                  if (parsed) setStartDateOnly(parsed);
                }}
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 14,
                  padding: 12,
                  fontWeight: "700",
                  color: THEME.text,
                  textAlign: "center",
                  fontSize: 15,
                }}
              />
            </>
          )}
        </Card>

        {/* Time Selector */}
        <Card>
          <Text
            style={{
              fontWeight: "900",
              color: THEME.text,
              fontSize: 14,
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            Hora de Inicio
          </Text>

          {/* Quick hour suggestion chips */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 12,
              justifyContent: "center",
            }}
          >
            {quickHours.map((h) => {
              const isSelected = fmtTime(start) === h;
              return (
                <Pressable
                  key={h}
                  onPress={() => {
                    const [hh, mm] = h.split(":").map(Number);
                    const d = new Date(start);
                    d.setHours(hh, mm, 0, 0);
                    setStart(d);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: isSelected ? THEME.primary : THEME.primarySoft,
                    borderRadius: 10,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    justifyContent: "center",
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontWeight: "800",
                      color: isSelected ? "#fff" : THEME.primary,
                      fontSize: 12,
                    }}
                  >
                    {h}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Minutes addition shortcuts */}
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            {[15, 30, 45, 60].map((m) => (
              <Pressable
                key={m}
                onPress={() => addMinutesToStart(m)}
                style={({ pressed }) => ({
                  backgroundColor: THEME.card,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 10,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    fontWeight: "800",
                    color: THEME.text,
                    fontSize: 12,
                  }}
                >
                  +{m} min
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Web HTML5 Time picker / Native Time dialog */}
          {!isWeb ? (
            <>
              <Pressable
                onPress={() => setShowTime(true)}
                style={({ pressed }) => ({
                  backgroundColor: THEME.primarySoft,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 14,
                  padding: 12,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text
                  style={{
                    fontWeight: "900",
                    color: THEME.primary,
                    textAlign: "center",
                    fontSize: 15,
                  }}
                >
                  {fmtTime(start)}
                </Text>
              </Pressable>

              {showTime && (
                <DateTimePicker
                  value={start}
                  mode="time"
                  is24Hour
                  onChange={(event: DateTimePickerEvent, selected?: Date) => {
                    setShowTime(false);
                    if (!selected) return;
                    const d = new Date(start);
                    d.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                    setStart(d);
                  }}
                />
              )}
            </>
          ) : (
            <View style={{ gap: 4 }}>
              <TextInput
                // @ts-ignore
                type="time"
                value={formatTimeHM(start)}
                onChangeText={(t) => {
                  const parts = t.split(":");
                  const hh = parseInt(parts[0], 10);
                  const mm = parseInt(parts[1], 10);
                  if (!isNaN(hh) && !isNaN(mm)) {
                    const next = new Date(start);
                    next.setHours(hh, mm, 0, 0);
                    setStart(next);
                  }
                }}
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 14,
                  padding: 12,
                  fontWeight: "700",
                  color: THEME.text,
                  textAlign: "center",
                  fontSize: 15,
                }}
              />
              <Text
                style={{
                  color: THEME.muted,
                  fontSize: 11,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                O ajusta con los sugeridos arriba.
              </Text>
            </View>
          )}
        </Card>

        {/* Pricing and Details */}
        <Card>
          <Text
            style={{
              fontWeight: "900",
              color: THEME.text,
              fontSize: 14,
              marginBottom: 6,
              paddingLeft: 4,
            }}
          >
            Monto del Turno (opcional)
          </Text>

          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Introduce el valor del servicio ($)"
            placeholderTextColor={THEME.muted}
            style={{
              backgroundColor: THEME.bg,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 14,
              padding: 12,
              fontWeight: "700",
              color: THEME.text,
              fontSize: 15,
            }}
          />

          <Text
            style={{
              fontWeight: "900",
              color: THEME.text,
              fontSize: 14,
              marginTop: 14,
              marginBottom: 6,
              paddingLeft: 4,
            }}
          >
            Notas / Descripción (opcional)
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Especifica el diseño, esculpido, semipermanente..."
            placeholderTextColor={THEME.muted}
            multiline
            style={{
              backgroundColor: THEME.bg,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 14,
              padding: 12,
              minHeight: 80,
              textAlignVertical: "top",
              color: THEME.text,
              fontWeight: "600",
              fontSize: 14,
            }}
          />

          {/* Paid switch pill */}
          <Pressable
            onPress={() => setPaid((p) => !p)}
            style={({ pressed }) => ({
              marginTop: 16,
              backgroundColor: paid ? "#ECFDF5" : THEME.examSoft,
              borderWidth: 1,
              borderColor: paid ? "rgba(92,168,133,0.3)" : THEME.examBorder,
              borderRadius: 14,
              paddingVertical: 12,
              width: "100%",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text
              style={{
                fontWeight: "900",
                textAlign: "center",
                color: paid ? THEME.success : THEME.exam,
                fontSize: 14,
              }}
            >
              {paid ? "Pago Recibido ✓" : "Pago Pendiente ⏳"}
            </Text>
          </Pressable>
        </Card>

        {/* Submit */}
        <PrimaryButton
          label={isSaving ? "Agendando..." : "Confirmar Cita 💅"}
          onPress={createAppointment}
          disabled={isSaving}
        />
      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === "ios" ? 44 : 20 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
      >
        {isWeb ? (
          Content
        ) : (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            {Content}
          </TouchableWithoutFeedback>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}