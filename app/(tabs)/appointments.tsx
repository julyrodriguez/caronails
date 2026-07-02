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

function formatDMY(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear());
  return `${dd}/${mm}/${yy}`;
}

function parseDMY(s: string): Date | null {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yy = Number(m[3]);

  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd)
    return null;

  return d;
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
        borderRadius: 18,
        padding: 14,
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
          <Text style={{ marginTop: 2, color: THEME.text }}>
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
          borderRadius: 18,
          paddingVertical: 14,
          alignItems: "center",
          borderWidth: isSecondary ? 1 : 0,
          borderColor: isSecondary ? THEME.border : "transparent",
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
  const [isTestingNotification, setIsTestingNotification] = React.useState(false);

  const [webDateText, setWebDateText] = React.useState(() =>
    formatDMY(new Date())
  );

  React.useEffect(() => {
    if (isWeb) setWebDateText(formatDMY(start));
  }, [start, isWeb]);

  React.useEffect(() => {
    if (!params?.date) return;

    const d = parseYMD(params.date);
    if (!d) return;

    const next = new Date(start);
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    next.setSeconds(0, 0);

    setStart(next);

    if (isWeb) setWebDateText(formatDMY(next));
    scrollToTop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

 async function testNotificationIn5Seconds() {
  if (Platform.OS === "web") {
    notify(
      "warn",
      "Solo en celular",
      "La prueba de notificaciones no funciona en web."
    );
    return;
  }

  if (isTestingNotification) return;

  try {
    setIsTestingNotification(true);

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      notify(
        "err",
        "Sin permisos",
        "No se otorgaron permisos para notificaciones."
      );
      return;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "💅 Prueba de notificación",
        body: "Si ves esto, las notificaciones locales funcionan.",
        sound: "default",
        data: { test: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });

    const list = await Notifications.getAllScheduledNotificationsAsync();
    console.log("TEST notificationId:", id);
    console.log("TEST programadas:", JSON.stringify(list, null, 2));

    notify(
      "ok",
      "Prueba agendada",
      "Te debería llegar una notificación en 5 segundos."
    );
  } catch (e: any) {
    console.log("Error en prueba de notificación:", e);
    notify(
      "err",
      "Error",
      e?.message ?? "No se pudo programar la notificación de prueba."
    );
  } finally {
    setIsTestingNotification(false);
  }
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

      const q = query(ref, where("startAt", "==", startTs), limit(1));
      const snap = await getDocs(q);

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

          const list = await Notifications.getAllScheduledNotificationsAsync();
          console.log(
            "NOTIFICACIONES PROGRAMADAS:",
            JSON.stringify(list, null, 2)
          );
        } catch (notificationError) {
          console.log(
            "El turno se guardó, pero falló la notificación:",
            notificationError
          );
        }
      }

      notify("ok", "Listo", "Turno agregado 💖");

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
        paddingBottom: 60,
        alignItems: "center",
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: "100%", maxWidth: 560, gap: 12 }}>
        <FlashBanner flash={flash} onClose={() => setFlash(null)} />

        <Card>
          <ClientPicker value={client} onChange={handleClientChange} />
        </Card>

        <Card>
          <Text
            style={{
              fontWeight: "900",
              color: THEME.text,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Fecha
          </Text>

          {!isWeb ? (
            <>
              <Pressable
                onPress={() => setShowDate(true)}
                style={{
                  backgroundColor: THEME.primarySoft,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 14,
                  padding: 12,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontWeight: "900",
                    color: THEME.primary,
                    textAlign: "center",
                  }}
                >
                  {fmtDate(start)}
                </Text>
              </Pressable>

              {showDate && (
                <DateTimePicker
                  value={start}
                  mode="date"
                  onChange={(
                    event: DateTimePickerEvent,
                    selected?: Date
                  ) => {
                    setShowDate(false);
                    if (!selected) return;
                    setStartDateOnly(selected);
                  }}
                />
              )}
            </>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "center",
                }}
              >
                {[
                  { label: "Hoy", days: 0 },
                  { label: "Mañana", days: 1 },
                  { label: "+2", days: 2 },
                  { label: "+3", days: 3 },
                  { label: "+7", days: 7 },
                ].map((b) => (
                  <Pressable
                    key={b.label}
                    onPress={() => applyQuickDate(b.days)}
                    style={{
                      backgroundColor: THEME.primarySoft,
                      borderRadius: 14,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "900",
                        color: THEME.primary,
                        textAlign: "center",
                      }}
                    >
                      {b.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text
                style={{
                  marginTop: 10,
                  color: THEME.muted,
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                Fecha (dd/mm/aaaa)
              </Text>

              <TextInput
                value={webDateText}
                onChangeText={(t) => {
                  setWebDateText(t);
                  const parsed = parseDMY(t);
                  if (parsed) setStartDateOnly(parsed);
                }}
                placeholder={formatDMY(new Date())}
                placeholderTextColor={THEME.muted}
                style={{
                  marginTop: 6,
                  backgroundColor: THEME.card,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 14,
                  padding: 12,
                  fontWeight: "900",
                  color: THEME.text,
                  textAlign: "center",
                }}
              />
            </>
          )}
        </Card>

        <Card>
          <Text
            style={{
              fontWeight: "900",
              color: THEME.text,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Hora inicio
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
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
                  style={{
                    backgroundColor: isSelected
                      ? THEME.primary
                      : THEME.primarySoft,
                    borderRadius: 14,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "800",
                      color: isSelected ? "#fff" : THEME.primary,
                      textAlign: "center",
                    }}
                  >
                    {h}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            {[15, 30, 60].map((m) => (
              <Pressable
                key={m}
                onPress={() => addMinutesToStart(m)}
                style={{
                  backgroundColor: THEME.card,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 14,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    fontWeight: "900",
                    color: THEME.text,
                    textAlign: "center",
                  }}
                >
                  +{m} min
                </Text>
              </Pressable>
            ))}
          </View>

          {!isWeb ? (
            <>
              <Pressable
                onPress={() => setShowTime(true)}
                style={{
                  backgroundColor: THEME.primarySoft,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    fontWeight: "900",
                    color: THEME.primary,
                    textAlign: "center",
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
            <View
              style={{
                backgroundColor: THEME.primarySoft,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 14,
                padding: 12,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "900",
                  color: THEME.primary,
                  textAlign: "center",
                }}
              >
                {fmtTime(start)}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  color: THEME.muted,
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                En web se elige con los sugeridos.
              </Text>
            </View>
          )}
        </Card>

        <Card>
          <Text
            style={{
              fontWeight: "900",
              color: THEME.text,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Monto (opcional)
          </Text>

          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Ingrese un valor"
            placeholderTextColor={THEME.muted}
            style={{
              backgroundColor: THEME.card,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 14,
              padding: 12,
              fontWeight: "900",
              color: THEME.text,
              textAlign: "center",
            }}
          />

          <Text
            style={{
              fontWeight: "900",
              color: THEME.text,
              marginTop: 12,
              textAlign: "center",
            }}
          >
            Descripción (opcional)
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Qué servicio se realizó..."
            placeholderTextColor={THEME.muted}
            multiline
            style={{
              marginTop: 6,
              backgroundColor: THEME.card,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 14,
              padding: 12,
              minHeight: 80,
              textAlignVertical: "top",
              color: THEME.text,
              textAlign: "center",
            }}
          />

          <Pressable
            onPress={() => setPaid((p) => !p)}
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              backgroundColor: paid ? "#DCFCE7" : "#FEF3C7",
              borderWidth: 1,
              borderColor: paid ? "#86EFAC" : "#FCD34D",
              borderRadius: 999,
              paddingVertical: 8,
              paddingHorizontal: 12,
              width: "100%",
            }}
          >
            <Text
              style={{
                fontWeight: "900",
                textAlign: "center",
                color: paid ? THEME.success : THEME.warning,
              }}
            >
              {paid ? "Pagado ✅" : "Pago pendiente ⏳"}
            </Text>
          </Pressable>
        </Card>

       
        <PrimaryButton
          label={isSaving ? "Guardando..." : "Agregar turno"}
          onPress={createAppointment}
          disabled={isSaving || isTestingNotification}
        />
      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <AppHeader title="Turnos" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
      >
        {isWeb ? (
          Content
        ) : (
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            {Content}
          </TouchableWithoutFeedback>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}