import React from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import AppHeader from "../../src/components/AppHeader";
import AppFooter from "../../src/components/AppFooter";
import { THEME } from "../../src/lib/theme";
import { dayKeyFromDate } from "../../src/lib/keys";
import { useAppointmentsByRange } from "../../src/hooks/useAppointments";
import {
  useFacultySchedule,
  useExamDays,
  weekdayName,
} from "../../src/hooks/useFacultySchedule";

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfNextMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function parseDayKey(dk: string): Date | null {
  const m = dk?.match?.(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (mo < 1 || mo > 12) return null;
  if (da < 1 || da > 31) return null;
  const dt = new Date(y, mo - 1, da);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== da
  )
    return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

function Pill({
  label,
  onPress,
  kind = "soft",
}: {
  label: string;
  onPress: () => void;
  kind?: "soft" | "primary";
}) {
  const primary = kind === "primary";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: primary ? THEME.primary : THEME.primarySoft,
        borderWidth: 1,
        borderColor: primary ? THEME.primary : THEME.border,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: "center",
        flex: 1,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Text
        style={{
          fontWeight: "900",
          fontSize: 14,
          color: primary ? "#fff" : THEME.primary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function CalendarMonthDailyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ dayKey?: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 600;

  const { getBlocksForDay, hasFacultyOnDate } = useFacultySchedule();
  const { examDayKeys, getExamsForDay } = useExamDays();

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [anchor, setAnchor] = React.useState<Date>(() => {
    const fromDayKey =
      typeof params.dayKey === "string" ? parseDayKey(params.dayKey) : null;
    return fromDayKey ?? new Date();
  });

  const days = React.useMemo(() => {
    const count = daysInMonth(anchor);
    const out: Date[] = [];
    for (let i = 1; i <= count; i++) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth(), i);
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
    return out;
  }, [anchor]);

  const monthStart = startOfMonth(anchor);
  const monthEndExclusive = startOfNextMonth(anchor);
  const { items: monthItems } = useAppointmentsByRange(
    monthStart,
    monthEndExclusive
  );

  const byDay = React.useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of monthItems as any[]) {
      if (it.clientNameSnapshot === "Facultad") continue;
      const k =
        it.dayKey ??
        (it.startAt?.toDate?.() ? dayKeyFromDate(it.startAt.toDate()) : "");
      if (!k) continue;
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        const da = a.startAt?.toDate?.() ? a.startAt.toDate().getTime() : 0;
        const db = b.startAt?.toDate?.() ? b.startAt.toDate().getTime() : 0;
        return da - db;
      });
      map.set(k, arr);
    }

    return map;
  }, [monthItems]);

  const totalsByDay = React.useMemo(() => {
    const map = new Map<
      string,
      { count: number; total: number; paidTotal: number }
    >();
    for (const d of days) {
      const k = dayKeyFromDate(d);
      const arr = byDay.get(k) ?? [];
      let total = 0;
      let paidTotal = 0;
      for (const ap of arr) {
        if (ap.canceled) continue;
        const amt = Number(ap.amount ?? 0) || 0;
        total += amt;
        if (ap.paid) paidTotal += amt;
      }
      map.set(k, { count: arr.length, total, paidTotal });
    }
    return map;
  }, [days, byDay]);

  const filteredCount = React.useMemo(() => {
    let c = 0;
    for (const [, arr] of byDay.entries()) c += arr.length;
    return c;
  }, [byDay]);

  function prevMonth() {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() - 1);
    setAnchor(d);
  }
  function nextMonth() {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() + 1);
    setAnchor(d);
  }

  const monthLabel = anchor.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  const listRef = React.useRef<FlatList<Date>>(null);
  React.useEffect(() => {
    if (typeof params.dayKey !== "string") return;
    const target = parseDayKey(params.dayKey);
    if (!target) return;

    setAnchor(new Date(target));

    requestAnimationFrame(() => {
      const idx = target.getDate() - 1;
      if (idx >= 0) {
        try {
          listRef.current?.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.1,
          });
        } catch {}
      }
    });
  }, [params.dayKey]);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <AppHeader title="Diario Mensual" subtitle={monthLabel} />

      {/* Nav month header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          alignItems: "center",
          width: "100%",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 520,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: THEME.card,
            padding: 12,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: THEME.border,
            shadowColor: "#2E1E2F",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 6,
          }}
        >
          <Pressable onPress={prevMonth} style={{ padding: 10 }}>
            <Text style={{ fontSize: 20, color: THEME.primary, fontWeight: "900" }}>{"‹"}</Text>
          </Pressable>

          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 16, textTransform: "capitalize" }}>
              {monthLabel}
            </Text>
            <Text style={{ marginTop: 2, color: THEME.muted, fontWeight: "700", fontSize: 12 }}>
              {days.length} días • {filteredCount} turno{filteredCount === 1 ? "" : "s"}
            </Text>
          </View>

          <Pressable onPress={nextMonth} style={{ padding: 10 }}>
            <Text style={{ fontSize: 20, color: THEME.primary, fontWeight: "900" }}>{"›"}</Text>
          </Pressable>
        </View>

        {/* Go to today button */}
        <View style={{ width: "100%", maxWidth: 520, marginTop: 10, flexDirection: "row", gap: 10 }}>
          <Pill
            label="Ir a Hoy"
            onPress={() => {
              setAnchor(new Date());
              requestAnimationFrame(() => {
                const idx = today.getDate() - 1;
                if (idx >= 0)
                  listRef.current?.scrollToIndex({
                    index: idx,
                    animated: true,
                    viewPosition: 0.1,
                  });
              });
            }}
          />
        </View>
      </View>

      {/* Days list */}
      <FlatList
        ref={listRef}
        data={days}
        keyExtractor={(d) => dayKeyFromDate(d)}
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 140,
          width: "100%",
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: day }) => {
          const k = dayKeyFromDate(day);
          const arr = byDay.get(k) ?? [];
          const totals = totalsByDay.get(k) ?? { count: 0, total: 0, paidTotal: 0 };

          const isToday = sameDay(day, today);
          const has = totals.count > 0;
          const hasFaculty = hasFacultyOnDate(day);
          const facultyBlocks = getBlocksForDay(day.getDay(), day);
          const dayExams = getExamsForDay(k);
          const hasExam = dayExams.some((e) => !e.isUniqueDay);
          const hasUniqueDay = dayExams.some((e) => e.isUniqueDay);

          return (
            <View
              style={{
                width: "100%",
                maxWidth: 520,
                marginBottom: 12,
                alignSelf: "center",
              }}
            >
              <View
                style={{
                  backgroundColor: THEME.card,
                  borderWidth: 1,
                  borderColor: hasExam
                    ? THEME.examBorder
                    : hasUniqueDay
                    ? (THEME as any).primaryBorder ?? THEME.primary
                    : isToday
                    ? THEME.primary
                    : hasFaculty
                    ? THEME.facultyBorder
                    : THEME.border,
                  borderRadius: 22,
                  padding: 16,
                  shadowColor: "#2E1E2F",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isToday ? 0.08 : 0.03,
                  shadowRadius: isToday ? 10 : 6,
                }}
              >
                {/* Header of day block */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text
                      style={{
                        fontWeight: "900",
                        color: THEME.primary,
                        fontSize: 15,
                        textTransform: "capitalize",
                      }}
                    >
                      {day.toLocaleDateString("es-AR", { weekday: "long" })}
                    </Text>
                    <Text
                      style={{
                        marginTop: 2,
                        fontWeight: "900",
                        color: THEME.text,
                        fontSize: 16,
                      }}
                    >
                      {day.toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                      {isToday ? " • Hoy" : ""}
                    </Text>

                    {/* Academic details */}
                    {facultyBlocks.length > 0 && (
                      <View style={{ marginTop: 4, gap: 2 }}>
                        {facultyBlocks.map((fb) => (
                          <Text
                            key={fb.id}
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: THEME.faculty,
                            }}
                          >
                            📚 Cursada: {fb.label} ({fb.startTime}-{fb.endTime})
                          </Text>
                        ))}
                      </View>
                    )}
                    {dayExams.map((e) => (
                      <Text
                        key={e.id}
                        style={{
                          fontSize: 11,
                          fontWeight: "900",
                          color: e.isUniqueDay ? THEME.primary : THEME.exam,
                          marginTop: 4,
                        }}
                      >
                        {e.isUniqueDay ? `✨ ${e.label}${e.description ? `: ${e.description}` : ""}` : `📝 Parcial: ${e.label}${e.startTime ? ` (${e.startTime})` : ""}`}
                      </Text>
                    ))}
                  </View>

                  {/* Summary badges on right */}
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/calendar/day",
                          params: { dayKey: k },
                        } as any)
                      }
                      style={{
                        backgroundColor: has ? THEME.primarySoft : THEME.bg,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        borderRadius: 10,
                        paddingVertical: 5,
                        paddingHorizontal: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "900",
                          color: has ? THEME.text : THEME.muted,
                          fontSize: 11,
                        }}
                      >
                        {totals.count} turno{totals.count === 1 ? "" : "s"}
                      </Text>
                    </Pressable>

                    <View
                      style={{
                        backgroundColor: THEME.primary,
                        borderRadius: 10,
                        paddingVertical: 5,
                        paddingHorizontal: 8,
                        opacity: has ? 1 : 0.3,
                      }}
                    >
                      <Text style={{ fontWeight: "900", color: "#fff", fontSize: 12 }}>
                        ${fmtMoney(totals.total)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Subtotals & Individual appointments details */}
                {has ? (
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: "rgba(233, 210, 220, 0.4)", paddingTop: 10 }}>
                    
                    {/* Sage and Sand split totals */}
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                      <View style={{ flex: 1, backgroundColor: "#ECFDF5", borderRadius: 10, paddingVertical: 6, alignItems: "center" }}>
                        <Text style={{ fontSize: 10, fontWeight: "900", color: THEME.success }}>PAGADO</Text>
                        <Text style={{ fontSize: 12, fontWeight: "900", color: THEME.text, marginTop: 2 }}>${fmtMoney(totals.paidTotal)}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: THEME.examSoft, borderRadius: 10, paddingVertical: 6, alignItems: "center" }}>
                        <Text style={{ fontSize: 10, fontWeight: "900", color: THEME.exam }}>PENDIENTE</Text>
                        <Text style={{ fontSize: 12, fontWeight: "900", color: THEME.text, marginTop: 2 }}>${fmtMoney(Math.max(0, totals.total - totals.paidTotal))}</Text>
                      </View>
                    </View>

                    {/* Appointments loop */}
                    <View style={{ gap: 6 }}>
                      {arr.map((ap: any) => (
                        <Pressable
                          key={ap.id}
                          onPress={() =>
                            router.push({
                              pathname: "/appointments/[appointmentId]",
                              params: {
                                appointmentId: ap.id,
                                from: "calendarMonth",
                                dayKey: k,
                                backTo: "/(tabs)/calendar/month",
                              },
                            } as any)
                          }
                          style={({ pressed }) => ({
                            backgroundColor: pressed ? THEME.primarySoft : THEME.bg,
                            borderWidth: 1,
                            borderColor: THEME.border,
                            borderRadius: 12,
                            padding: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          })}
                        >
                          <View style={{ flex: 1, paddingRight: 6 }}>
                            <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 13 }} numberOfLines={1}>
                              {fmtHour(ap)} • {ap.clientNameSnapshot}
                            </Text>
                            {ap.description ? (
                              <Text style={{ color: THEME.muted, fontSize: 11, fontWeight: "600", marginTop: 1 }} numberOfLines={1}>
                                {ap.description}
                              </Text>
                            ) : null}
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontWeight: "900", color: THEME.primary, fontSize: 13 }}>
                              ${ap.amount}
                            </Text>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "800",
                                color: ap.canceled ? "#EF4444" : (ap.paid ? THEME.success : THEME.exam),
                                marginTop: 1,
                              }}
                            >
                              {ap.canceled ? "Cancelado" : (ap.paid ? "Cobrado ✓" : "Impago")}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text
                    style={{
                      marginTop: 12,
                      color: THEME.muted,
                      fontWeight: "700",
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    Sin citas registradas
                  </Text>
                )}
              </View>
            </View>
          );
        }}
      />

      <AppFooter showMenu menuHref="/(tabs)/calendar" showBack />
    </View>
  );
}