import React from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Platform,
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
  // dk = YYYY-MM-DD
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
      style={{
        backgroundColor: primary ? THEME.primary : THEME.primarySoft,
        borderWidth: 1,
        borderColor: primary ? THEME.primary : THEME.border,
        borderRadius: 999,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontWeight: "900",
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
  const isWeb = Platform.OS === "web";

  // Faculty & Exams
  const { facultyDaysOfWeek, getBlocksForDay } = useFacultySchedule();
  const { examDayKeys, getExamForDay } = useExamDays();

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // ✅ Anchor = mes/año que estoy viendo
  const [anchor, setAnchor] = React.useState<Date>(() => {
    const fromDayKey =
      typeof params.dayKey === "string" ? parseDayKey(params.dayKey) : null;
    return fromDayKey ?? new Date();
  });

  // ✅ Lista de días del mes (1..último día)
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

  // ✅ Traer todos los turnos del mes (1 query)
  const monthStart = startOfMonth(anchor);
  const monthEndExclusive = startOfNextMonth(anchor);
  const { items: monthItems } = useAppointmentsByRange(
    monthStart,
    monthEndExclusive
  );

  // ✅ Agrupar por día (filtrando Facultad)
  const byDay = React.useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of monthItems as any[]) {
      // ✅ Filtrar turnos de Facultad
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

  // ✅ Totales por día
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
        if (ap.canceled) continue; // Excluir turnos cancelados
        const amt = Number(ap.amount ?? 0) || 0;
        total += amt;
        if (ap.paid) paidTotal += amt;
      }
      map.set(k, { count: arr.length, total, paidTotal });
    }
    return map;
  }, [days, byDay]);

  // Conteo filtrado (sin Facultad) para el header
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

  const title = anchor.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  // ✅ Scrollear al día si viene por params.dayKey
  const listRef = React.useRef<FlatList<Date>>(null);
  React.useEffect(() => {
    if (typeof params.dayKey !== "string") return;
    const target = parseDayKey(params.dayKey);
    if (!target) return;

    // si el target no es del mismo mes, igual lo movemos
    setAnchor(new Date(target));

    // esperamos que renderice el mes correcto
    requestAnimationFrame(() => {
      const idx = target.getDate() - 1; // 0-based
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.dayKey]);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <AppHeader title="Diario mensual" subtitle={title} />

      {/* Header navegación mes */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 560,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable onPress={prevMonth} style={{ padding: 10 }}>
            <Text
              style={{
                fontSize: 22,
                color: THEME.primary,
                fontWeight: "900",
              }}
            >
              {"<"}
            </Text>
          </Pressable>

          <View style={{ alignItems: "center", flex: 1 }}>
            <Text
              style={{
                fontWeight: "900",
                color: THEME.text,
                textAlign: "center",
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                marginTop: 2,
                color: THEME.muted,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              {days.length} días • {filteredCount} turno
              {filteredCount === 1 ? "" : "s"}
            </Text>
          </View>

          <Pressable onPress={nextMonth} style={{ padding: 10 }}>
            <Text
              style={{
                fontSize: 22,
                color: THEME.primary,
                fontWeight: "900",
              }}
            >
              {">"}
            </Text>
          </Pressable>
        </View>

        {/* Botón volver a hoy */}
        <View style={{ width: "100%", maxWidth: 560, marginTop: 10 }}>
          <Pill
            label="Ir a hoy"
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

      {/* Lista de todos los días */}
      <FlatList
        ref={listRef}
        data={days}
        keyExtractor={(d) => dayKeyFromDate(d)}
        style={{ flex: 1, width: "100%" }} // ✅ Android: asegura ancho real del list
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 140, // ✅ espacio para footer fijo
          width: "100%", // ✅ Android: evita shrink del container
        }}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {
          setTimeout(() => {
            try {
              listRef.current?.scrollToIndex({ index: 0, animated: true });
            } catch {}
          }, 250);
        }}
        renderItem={({ item: day }) => {
          const k = dayKeyFromDate(day);
          const arr = byDay.get(k) ?? [];
          const totals =
            totalsByDay.get(k) ?? { count: 0, total: 0, paidTotal: 0 };

          const isToday = sameDay(day, today);
          const has = totals.count > 0;
          const hasFaculty = facultyDaysOfWeek.has(day.getDay());
          const facultyBlocks = getBlocksForDay(day.getDay());
          const exam = getExamForDay(k);

          return (
            <View
              style={{
                width: "100%",
                maxWidth: 560,
                marginBottom: 12,
                alignSelf: "center",
              }}
            >
              <Pressable
                onPress={() => {
                  // opcional
                }}
                style={{
                  backgroundColor: THEME.card,
                  borderWidth: exam ? 2 : 1,
                  borderColor: exam
                    ? THEME.examBorder
                    : isToday
                    ? THEME.primary
                    : hasFaculty
                    ? THEME.facultyBorder
                    : THEME.border,
                  borderRadius: 20,
                  padding: 14,
                }}
              >
                {/* Header del día */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text
                      style={{
                        fontWeight: "900",
                        color: THEME.primary,
                        textAlign: "left",
                      }}
                    >
                      {day.toLocaleDateString("es-AR", { weekday: "long" })}
                    </Text>
                    <Text
                      style={{
                        marginTop: 2,
                        fontWeight: "900",
                        color: THEME.text,
                      }}
                    >
                      {day.toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                      {isToday ? " • Hoy" : ""}
                    </Text>

                    {/* Faculty / Exam indicators */}
                    {facultyBlocks.length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        {facultyBlocks.map((fb) => (
                          <Text
                            key={fb.id}
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color: THEME.faculty,
                            }}
                          >
                            📚 {fb.label} • {fb.startTime} - {fb.endTime}
                          </Text>
                        ))}
                      </View>
                    )}
                    {exam && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "900",
                          color: THEME.exam,
                          marginTop: 4,
                        }}
                      >
                        📝 {exam.label}
                        {exam.startTime && exam.endTime
                          ? ` • ${exam.startTime} - ${exam.endTime}`
                          : ""}
                      </Text>
                    )}
                  </View>

                  {/* “píldoras” a la derecha */}
                  <View style={{ alignItems: "flex-end" }}>
                    <View
                      style={{
                        backgroundColor: has ? THEME.primarySoft : THEME.bg,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        borderRadius: 999,
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "900",
                          color: has ? THEME.primary : THEME.muted,
                        }}
                      >
                        {totals.count} turno{totals.count === 1 ? "" : "s"}
                      </Text>
                    </View>

                    <View
                      style={{
                        marginTop: 8,
                        backgroundColor: THEME.primary,
                        borderRadius: 999,
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        opacity: has ? 1 : 0.35,
                      }}
                    >
                      <Text style={{ fontWeight: "900", color: "#fff" }}>
                        ${fmtMoney(totals.total)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Subtotales: pagado / pendiente */}
                {has ? (
                  <View
                    style={{
                      marginTop: 12,
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        backgroundColor: "#DCFCE7",
                        borderRadius: 16,
                        padding: 10,
                        alignItems: "center",
                        marginRight: 10,
                      }}
                    >
                      <Text style={{ fontWeight: "900", color: THEME.success }}>
                        Pagado
                      </Text>
                      <Text
                        style={{
                          marginTop: 2,
                          fontWeight: "900",
                          color: THEME.text,
                        }}
                      >
                        ${fmtMoney(totals.paidTotal)}
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        backgroundColor: "#FEF3C7",
                        borderRadius: 16,
                        padding: 10,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontWeight: "900", color: THEME.warning }}>
                        Pendiente
                      </Text>
                      <Text
                        style={{
                          marginTop: 2,
                          fontWeight: "900",
                          color: THEME.text,
                        }}
                      >
                        $
                        {fmtMoney(
                          Math.max(0, totals.total - totals.paidTotal)
                        )}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text
                    style={{
                      marginTop: 12,
                      color: THEME.muted,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    Sin turnos
                  </Text>
                )}

                {/* Turnos del día */}
                {has ? (
                  <View style={{ marginTop: 12 }}>
                    {arr.map((ap: any, idx: number) => (
                      <Pressable
                        key={ap.id ?? `${k}-${idx}`}
                        onPress={() =>
                          router.push({
                            pathname: "/appointments/[appointmentId]",
                            params: {
                              appointmentId: ap.id,
                              from: "calendarMonth",
                              dayKey: k,
                              backTo: "/calendar/month",
                            },
                          } as any)
                        }
                        style={{
                          borderTopWidth: idx === 0 ? 0 : 1,
                          borderTopColor: THEME.border,
                          paddingVertical: 10,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text
                            style={{
                              fontWeight: "900",
                              color: THEME.text,
                            }}
                          >
                            {fmtHour(ap)} • {ap.clientNameSnapshot ?? "Clienta"}
                          </Text>

                          {ap.description ? (
                            <Text
                              style={{
                                marginTop: 2,
                                color: THEME.muted,
                                fontWeight: "700",
                              }}
                              numberOfLines={1}
                            >
                              {ap.description}
                            </Text>
                          ) : (
                            <Text
                              style={{
                                marginTop: 2,
                                color: THEME.muted,
                                fontWeight: "700",
                              }}
                              numberOfLines={1}
                            >
                              Sin descripcion
                            </Text>
                          )}
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              fontWeight: "900",
                              color: THEME.primary,
                            }}
                          >
                            ${fmtMoney(Number(ap.amount ?? 0) || 0)}
                          </Text>
                          <Text
                            style={{
                              marginTop: 2,
                              fontWeight: "900",
                              color: ap.canceled
                                ? "#dc2626"
                                : ap.paid
                                ? THEME.success
                                : THEME.warning,
                            }}
                          >
                            {ap.canceled
                              ? "Cancelado ❌"
                              : ap.paid
                              ? "Pagado ✅"
                              : "Pago pendiente ⏳"}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </Pressable>
            </View>
          );
        }}
      />

      <AppFooter showMenu menuHref="/(tabs)/calendar" showBack />
    </View>
  );
}