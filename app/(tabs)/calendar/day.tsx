import React from "react";
import { View, Text, Pressable, Platform, FlatList, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import AppFooter from "../../src/components/AppFooter";
import { THEME } from "../../src/lib/theme";
import { dayKeyFromDate } from "../../src/lib/keys";
import { useAppointmentsByRange } from "../../src/hooks/useAppointments";
import {
  useFacultySchedule,
  useExamDays,
} from "../../src/hooks/useFacultySchedule";

function parseDayKey(dk: string): Date | null {
  const m = dk?.match?.(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (mo < 1 || mo > 12) return null;
  if (da < 1 || da > 31) return null;
  const d = new Date(y, mo - 1, da);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da)
    return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfNextDay(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

function fmtHour(ap: any) {
  const dt = ap.startAt?.toDate?.() ? ap.startAt.toDate() : null;
  return dt
    ? dt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
}
function fmtMoney(n: number) {
  return n.toLocaleString("es-AR");
}

export default function CalendarDayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ dayKey?: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 600;

  const dk = typeof params.dayKey === "string" ? params.dayKey : "";
  const day = React.useMemo(() => (dk ? parseDayKey(dk) : null), [dk]);

  const rangeStart = React.useMemo(() => (day ? startOfDay(day) : null), [day]);
  const rangeEnd = React.useMemo(() => (day ? startOfNextDay(day) : null), [day]);

  const { items: rawItems } = useAppointmentsByRange(
    rangeStart ?? new Date(0),
    rangeEnd ?? new Date(0)
  );

  // Faculty & Exams
  const { getBlocksForDay } = useFacultySchedule();
  const { getExamsForDay } = useExamDays();

  const facultyBlocks = day ? getBlocksForDay(day.getDay(), day) : [];
  const dayExams = dk ? getExamsForDay(dk) : [];

  // Filtrar turnos de Facultad
  const items = React.useMemo(
    () => (rawItems as any[]).filter((it) => it.clientNameSnapshot !== "Facultad"),
    [rawItems]
  );

  const sorted = React.useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const da = a.startAt?.toDate?.() ? a.startAt.toDate().getTime() : 0;
      const db = b.startAt?.toDate?.() ? b.startAt.toDate().getTime() : 0;
      return da - db;
    });
    return arr;
  }, [items]);

  const totals = React.useMemo(() => {
    let total = 0;
    let paidTotal = 0;
    for (const ap of sorted) {
      if (ap.canceled) continue;
      const amt = Number(ap.amount ?? 0) || 0;
      total += amt;
      if (ap.paid) paidTotal += amt;
    }
    return { total, paidTotal, pendingTotal: Math.max(0, total - paidTotal) };
  }, [sorted]);

  if (!day) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === "ios" ? 44 : 20 }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Text style={{ color: THEME.muted, fontWeight: "700" }}>Fecha inválida o no seleccionada</Text>
        </View>
        <AppFooter showBack />
      </View>
    );
  }

  const titleStr = day.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === "ios" ? 44 : 20 }}>

      <FlatList
        data={sorted}
        keyExtractor={(it) => it.id}
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 140,
          alignItems: "center",
          gap: 12,
        }}
        ListHeaderComponent={
          <View style={{ width: "100%", maxWidth: 520, gap: 14 }}>
            {/* Header info */}
            <View
              style={{
                backgroundColor: THEME.card,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 24,
                padding: 20,
                alignItems: "center",
                shadowColor: "#2E1E2F",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
              }}
            >
              <Text
                style={{
                  fontWeight: "900",
                  color: THEME.text,
                  textAlign: "center",
                  fontSize: 18,
                  textTransform: "capitalize",
                }}
              >
                {titleStr}
              </Text>
              <Text
                style={{
                  marginTop: 6,
                  fontWeight: "800",
                  color: THEME.primary,
                  fontSize: 14,
                }}
              >
                {sorted.length} turno{sorted.length === 1 ? "" : "s"} agendado{sorted.length === 1 ? "" : "s"}
              </Text>
            </View>

            {/* Faculty / Exam banners */}
            {facultyBlocks.length > 0 && (
              <View
                style={{
                  backgroundColor: THEME.facultySoft,
                  borderWidth: 1,
                  borderColor: THEME.facultyBorder,
                  borderRadius: 16,
                  padding: 12,
                  gap: 4,
                }}
              >
                {facultyBlocks.map((fb) => (
                  <Text
                    key={fb.id}
                    style={{
                      fontWeight: "900",
                      color: THEME.faculty,
                      textAlign: "center",
                      fontSize: 13,
                    }}
                  >
                    📚 Bloque Facultad: {fb.label} ({fb.startTime} - {fb.endTime})
                  </Text>
                ))}
              </View>
            )}

            {dayExams.map((e) => (
              <View
                key={e.id}
                style={{
                  backgroundColor: e.isUniqueDay ? "rgba(233, 210, 220, 0.3)" : THEME.examSoft,
                  borderWidth: 1,
                  borderColor: e.isUniqueDay ? THEME.primary : THEME.examBorder,
                  borderRadius: 16,
                  padding: 12,
                  marginTop: 6,
                }}
              >
                <Text
                  style={{
                    fontWeight: "900",
                    color: e.isUniqueDay ? THEME.text : THEME.exam,
                    textAlign: "center",
                    fontSize: 13,
                  }}
                >
                  {e.isUniqueDay ? `✨ ${e.label}` : `📝 Examen: ${e.label}`} {e.startTime ? `(${e.startTime} - ${e.endTime})` : ""}
                </Text>
                {e.isUniqueDay && e.description ? (
                  <Text
                    style={{
                      fontWeight: "700",
                      color: THEME.muted,
                      textAlign: "center",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {e.description}
                  </Text>
                ) : null}
              </View>
            ))}

            {/* Financial summary blocks layout */}
            <View style={{ gap: 10 }}>
              <View
                style={{
                  backgroundColor: THEME.card,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 18,
                  padding: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "800", color: THEME.muted, fontSize: 14 }}>
                  Monto Estimado Diario
                </Text>
                <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 20 }}>
                  ${fmtMoney(totals.total)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                {/* Paid card */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#ECFDF5", // Sage pastel bg
                    borderWidth: 1,
                    borderColor: "rgba(92, 168, 133, 0.3)",
                    borderRadius: 18,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "900", color: THEME.success, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Pagado ✓
                  </Text>
                  <Text style={{ marginTop: 4, fontWeight: "900", color: THEME.text, fontSize: 18 }}>
                    ${fmtMoney(totals.paidTotal)}
                  </Text>
                </View>

                {/* Pending card */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: THEME.examSoft, // warm sand tone
                    borderWidth: 1,
                    borderColor: THEME.examBorder,
                    borderRadius: 18,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "900", color: THEME.exam, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Pendiente ⏳
                  </Text>
                  <Text style={{ marginTop: 4, fontWeight: "900", color: THEME.text, fontSize: 18 }}>
                    ${fmtMoney(totals.pendingTotal)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Section label */}
            <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 15, paddingLeft: 4 }}>
                Cronograma de Turnos
              </Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/appointments",
                    params: { date: dk },
                  } as any)
                }
                style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: THEME.primarySoft }}
              >
                <Text style={{ color: THEME.primary, fontWeight: "800", fontSize: 12 }}>＋ Agregar</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ width: "100%", maxWidth: 520, marginTop: 10 }}>
            <View
              style={{
                backgroundColor: THEME.card,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 20,
                padding: 32,
                alignItems: "center",
                shadowColor: "#2E1E2F",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.03,
                shadowRadius: 10,
              }}
            >
              <Text style={{ fontSize: 24, marginBottom: 8 }}>💅</Text>
              <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 15 }}>
                Día sin turnos
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  color: THEME.muted,
                  fontWeight: "600",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                No hay citas agendadas para hoy. ¡Aprovecha para descansar! 💖
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/appointments/[appointmentId]",
                params: {
                  appointmentId: item.id,
                  dayKey: dk,
                  backTo: "/(tabs)/calendar/day",
                },
              } as any)
            }
            style={({ pressed }) => ({
              width: "100%",
              maxWidth: 520,
              backgroundColor: THEME.card,
              borderWidth: 1,
              borderColor: item.canceled ? "rgba(239,68,68,0.2)" : THEME.border,
              borderRadius: 18,
              padding: 16,
              opacity: pressed ? 0.95 : 1,
              shadowColor: "#2E1E2F",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 6,
            })}
          >
            {/* Hour and client name */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text
                style={{
                  fontWeight: "900",
                  color: THEME.text,
                  fontSize: 16,
                }}
              >
                ⏱ {fmtHour(item)} • {item.clientNameSnapshot ?? "Clienta"}
              </Text>

              {/* Status pill label */}
              <View
                style={{
                  backgroundColor: item.canceled
                    ? "#FEF2F2"
                    : item.paid
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
                    color: item.canceled
                      ? "#EF4444"
                      : item.paid
                      ? THEME.success
                      : THEME.exam,
                  }}
                >
                  {item.canceled ? "Cancelado" : item.paid ? "Pagado ✓" : "Pendiente"}
                </Text>
              </View>
            </View>

            {/* Price tag and secondary info */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                {item.description ? (
                  <Text
                    numberOfLines={2}
                    style={{
                      color: THEME.muted,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {item.description}
                  </Text>
                ) : (
                  <Text style={{ color: THEME.muted, fontStyle: "italic", fontSize: 12, fontWeight: "500" }}>
                    Sin descripción de servicio
                  </Text>
                )}
              </View>
              
              <Text style={{ fontWeight: "900", color: THEME.primary, fontSize: 16 }}>
                ${fmtMoney(Number(item.amount ?? 0) || 0)}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <AppFooter showMenu menuHref="/(tabs)/calendar" showBack />
    </View>
  );
}