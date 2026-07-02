import React from "react";
import { View, Text, Pressable, Platform, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import AppHeader from "../../src/components/AppHeader";
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
  const { getExamForDay } = useExamDays();

  const facultyBlocks = day ? getBlocksForDay(day.getDay()) : [];
  const exam = dk ? getExamForDay(dk) : null;

const dayKey= "2026-03-02";

  // ✅ Filtrar turnos de Facultad
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
      if (ap.canceled) continue; // Excluir turnos cancelados
      const amt = Number(ap.amount ?? 0) || 0;
      total += amt;
      if (ap.paid) paidTotal += amt;
    }
    return { total, paidTotal, pendingTotal: Math.max(0, total - paidTotal) };
  }, [sorted]);

  if (day) {
    const title = day.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <AppHeader title="Turnos del día" />

        <FlatList
          data={sorted}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 140,
            alignItems: "center",
            gap: 12,
          }}
          ListHeaderComponent={
            <View style={{ width: "100%", maxWidth: 560, gap: 12 }}>
              <View
                style={{
                  backgroundColor: THEME.card,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 20,
                  padding: 20,
                }}
              >
                <Text
                  style={{
                    fontWeight: "900",
                    color: THEME.primary,
                    textAlign: "center",
                    fontSize: 18,
                    textTransform: "capitalize",
                  }}
                >
                  {title}
                </Text>
                <Text
                  style={{
                    marginTop: 8,
                    fontWeight: "900",
                    color: THEME.text,
                    textAlign: "center",
                    fontSize: 15,
                  }}
                >
                  {sorted.length} turno{sorted.length === 1 ? "" : "s"}
                </Text>
              </View>

                {/* Faculty banner */}
                {facultyBlocks.length > 0 && (
                  <View
                    style={{
                      backgroundColor: THEME.facultySoft,
                      borderWidth: 1,
                      borderColor: THEME.facultyBorder,
                      borderRadius: 16,
                      padding: 14,
                      alignItems: "center",
                    }}
                  >
                    {facultyBlocks.map((fb) => (
                      <Text
                        key={fb.id}
                        style={{
                          fontWeight: "900",
                          color: THEME.faculty,
                          textAlign: "center",
                        }}
                      >
                        📚 {fb.label} • {fb.startTime} - {fb.endTime}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Exam banner */}
                {exam && (
                  <View
                    style={{
                      backgroundColor: THEME.examSoft,
                      borderWidth: 1,
                      borderColor: THEME.examBorder,
                      borderRadius: 16,
                      padding: 14,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "900",
                        color: THEME.exam,
                        textAlign: "center",
                      }}
                    >
                      📝 {exam.label}
                      {exam.startTime && exam.endTime
                        ? ` • ${exam.startTime} - ${exam.endTime}`
                        : ""}
                    </Text>
                  </View>
                )}

              <View
                style={{
                  backgroundColor: THEME.card,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 20,
                  padding: 20,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#F3F4F6",
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "700",
                      color: THEME.muted,
                      fontSize: 13,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Total del día
                  </Text>
                  <Text
                    style={{
                      marginTop: 6,
                      fontWeight: "900",
                      color: THEME.text,
                      fontSize: 28,
                    }}
                  >
                    ${fmtMoney(totals.total)}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#DCFCE7",
                    borderWidth: 1,
                    borderColor: "#86EFAC",
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "700",
                      color: THEME.success,
                      fontSize: 13,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Pagado ✅
                  </Text>
                  <Text
                    style={{
                      marginTop: 6,
                      fontWeight: "900",
                      color: THEME.text,
                      fontSize: 24,
                    }}
                  >
                    ${fmtMoney(totals.paidTotal)}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#FEF3C7",
                    borderWidth: 1,
                    borderColor: "#FCD34D",
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "700",
                      color: THEME.warning,
                      fontSize: 13,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Pendiente ⏳
                  </Text>
                  <Text
                    style={{
                      marginTop: 6,
                      fontWeight: "900",
                      color: THEME.text,
                      fontSize: 24,
                    }}
                  >
                    ${fmtMoney(totals.pendingTotal)}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/calendar/month",
                    params: { dayKey: dayKeyFromDate(day) },
                  } as any)
                }
                style={{
                  backgroundColor: THEME.primarySoft,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 18,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: THEME.primary,
                    fontWeight: "900",
                    fontSize: 15,
                  }}
                >
                  ← Ver el mes completo
                </Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <View style={{ width: "100%", maxWidth: 560 }}>
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: THEME.card,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 18,
                  padding: 16,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900", color: THEME.text }}>
                  Sin turnos
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    color: THEME.muted,
                    fontWeight: "700",
                  }}
                >
                  No hay turnos cargados este día 💖
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/appointments/[appointmentId]", // tu detalle real
                  params: {
                    appointmentId: item.id, // o ap.id según tu loop
                    params: { dayKey },
                    backTo: "calendar/day",
                  },
                } as any)
              }
              style={{
                width: "100%",
                maxWidth: 560,
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
                  color: THEME.primary,
                }}
              >
                {fmtHour(item)} • {item.clientNameSnapshot ?? "Clienta"}
              </Text>

              <Text
                style={{
                  marginTop: 6,
                  fontWeight: "900",
                  color: item.canceled
                    ? "#dc2626"
                    : item.paid
                    ? THEME.success
                    : THEME.warning,
                }}
              >
                ${fmtMoney(Number(item.amount ?? 0) || 0)} •{" "}
                {item.canceled
                  ? "Cancelado ❌"
                  : item.paid
                  ? "Pagado ✅"
                  : "Pago pendiente ⏳"}
              </Text>

              {item.description ? (
                <Text
                  style={{
                    marginTop: 6,
                    color: THEME.muted,
                    fontWeight: "700",
                  }}
                >
                  {item.description}
                </Text>
              ) : null}
            </Pressable>
          )}
        />

        <AppFooter showMenu menuHref="/(tabs)/calendar" showBack />
      </View>
    );
  }
}