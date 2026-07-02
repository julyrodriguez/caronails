import React from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";

import AppHeader from "../../src/components/AppHeader";
import { THEME } from "../../src/lib/theme";
import {
  dayKeyFromDate,
  startOfWeekMon,
  weekDaysMonToSat,
} from "../../src/lib/keys";
import { useAppointmentsByRange } from "../../src/hooks/useAppointments";
import {
  useFacultySchedule,
  useExamDays,
  weekdayName,
} from "../../src/hooks/useFacultySchedule";

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

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

function fmtHour(ap: any) {
  const dt = ap.startAt?.toDate?.() ? ap.startAt.toDate() : null;
  return dt
    ? dt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? THEME.primary : THEME.primarySoft,
        borderWidth: 1,
        borderColor: active ? THEME.primary : THEME.border,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
      }}
    >
      <Text style={{ fontWeight: "900", color: active ? "#fff" : THEME.primary }}>
        {label}
      </Text>
    </Pressable>
  );
}

function MiniChip({ text, inverted, variant = "default" }: { text: string; inverted?: boolean; variant?: "default" | "faculty" | "exam" }) {
  const colors = {
    default: {
      bg: inverted ? "rgba(255,255,255,0.18)" : THEME.primarySoft,
      border: inverted ? "rgba(255,255,255,0.25)" : THEME.border,
      text: inverted ? "#fff" : THEME.primary,
    },
    faculty: {
      bg: inverted ? "rgba(124,58,237,0.25)" : THEME.facultySoft,
      border: inverted ? "rgba(196,181,253,0.5)" : THEME.facultyBorder,
      text: inverted ? "#DDD6FE" : THEME.faculty,
    },
    exam: {
      bg: inverted ? "rgba(217,119,6,0.25)" : THEME.examSoft,
      border: inverted ? "rgba(252,211,77,0.5)" : THEME.examBorder,
      text: inverted ? "#FDE68A" : THEME.exam,
    },
  };

  const c = colors[variant];

  return (
    <View
      style={{
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginTop: 6,
        alignSelf: "stretch",
      }}
    >
      <Text
        style={{
          color: c.text,
          fontWeight: "900",
          fontSize: 12,
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

// ✅ yyyy-mm-dd para pasar por params a Turnos
function ymd(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Grilla fija de 6 columnas (Lun..Sáb)
 */
function buildMonthGridMonToSat(anchor: Date) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = startOfNextMonth(anchor);
  const gridStart = startOfWeekMon(monthStart);

  const cells: Date[] = [];
  for (let w = 0; w < 6; w++) {
    const weekStart = new Date(gridStart);
    weekStart.setDate(gridStart.getDate() + w * 7);

    if (w > 0 && weekStart >= monthEnd) break;

    for (let i = 0; i < 6; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      cells.push(d);
    }
  }

  return { cells };
}

export default function CalendarIndexScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { width: winWidth } = useWindowDimensions();

  const today = React.useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d;
  }, []);

  const [mode, setMode] = React.useState<"week" | "calendar">("week");
  const [anchor, setAnchor] = React.useState<Date>(() => new Date());
  const [selected, setSelected] = React.useState<Date>(() => new Date());

  const weekRef = React.useRef<FlatList<Date>>(null);

  // Faculty & Exams
  const { blocks, facultyDaysOfWeek, getBlocksForDay } = useFacultySchedule();
  const { examDayKeys, getExamForDay } = useExamDays();

  React.useEffect(() => {
    setAnchor(new Date(today));
    setSelected(new Date(today));
  }, [today]);

  // ===== Semana
  const weekDays = weekDaysMonToSat(anchor);
  const weekStart = weekDays[0];
  const weekEndExclusive = new Date(weekDays[5]);
  weekEndExclusive.setDate(weekEndExclusive.getDate() + 1);

  const { items: weekItems } = useAppointmentsByRange(weekStart, weekEndExclusive);

  const weekByDay = React.useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of weekItems as any[]) {
      // ✅ Filtrar turnos de Facultad
      if (it.clientNameSnapshot === "Facultad") continue;
      const k = it.dayKey;
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a: any, b: any) => {
        const da = a.startAt?.toDate?.() ? a.startAt.toDate().getTime() : 0;
        const db = b.startAt?.toDate?.() ? b.startAt.toDate().getTime() : 0;
        return da - db;
      });
      map.set(k, arr);
    }
    return map;
  }, [weekItems]);

  // ===== Mes
  const monthStart = startOfMonth(anchor);
  const monthEndExclusive = startOfNextMonth(anchor);
  const { items: monthItems } = useAppointmentsByRange(monthStart, monthEndExclusive);

  const monthByDay = React.useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of monthItems as any[]) {
      // ✅ Filtrar turnos de Facultad
      if (it.clientNameSnapshot === "Facultad") continue;
      const k = it.dayKey;
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a: any, b: any) => {
        const da = a.startAt?.toDate?.() ? a.startAt.toDate().getTime() : 0;
        const db = b.startAt?.toDate?.() ? b.startAt.toDate().getTime() : 0;
        return da - db;
      });
      map.set(k, arr);
    }
    return map;
  }, [monthItems]);

  // ===== Grid calendario
  const { cells: gridCells } = React.useMemo(
    () => buildMonthGridMonToSat(anchor),
    [anchor]
  );

  const GAP = 8;
  const [gridWidth, setGridWidth] = React.useState(0);

  const safeGridWidth = React.useMemo(() => {
    if (gridWidth > 0) return gridWidth;
    return Math.min(winWidth - 32, 560);
  }, [gridWidth, winWidth]);

  const cellSize = React.useMemo(() => {
    const w = safeGridWidth;
    return Math.max(44, Math.floor((w - GAP * 5) / 6));
  }, [safeGridWidth]);

  // Modal
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalDay, setModalDay] = React.useState<Date | null>(null);

  function prevPeriod() {
    const d = new Date(anchor);
    if (mode === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setAnchor(d);
  }
  function nextPeriod() {
    const d = new Date(anchor);
    if (mode === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setAnchor(d);
  }

  const title =
    mode === "week"
      ? `${weekDays[0].toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} - ${weekDays[5].toLocaleDateString(
          "es-AR",
          { day: "2-digit", month: "short" }
        )}`
      : anchor.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  function openDayModal(day: Date) {
    setModalDay(day);
    setModalOpen(true);
  }

  const modalKey = modalDay ? dayKeyFromDate(modalDay) : "";
  const modalTurns = modalKey ? monthByDay.get(modalKey) ?? [] : [];
  const modalExam = modalDay ? getExamForDay(dayKeyFromDate(modalDay)) : null;
  const modalFacultyBlocks = modalDay ? getBlocksForDay(modalDay.getDay()) : [];

  React.useEffect(() => {
    setAnchor(new Date(today));
    setSelected(new Date(today));

    if (mode === "week") {
      requestAnimationFrame(() => {
        const idx = weekDays.findIndex((d) => sameDay(d, today));
        if (idx >= 0)
          weekRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Sorted active blocks for weekly summary
  const sortedBlocks = React.useMemo(() => {
    return [...blocks]
      .filter((b) => b.active)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  }, [blocks]);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <AppHeader title="Calendario" />

      {/* Pills */}
      <View style={{ paddingHorizontal: 16, marginTop: 10, alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pill label="Semana" active={mode === "week"} onPress={() => setMode("week")} />
          <Pill label="Calendario" active={mode === "calendar"} onPress={() => setMode("calendar")} />
        </View>
      </View>

      {/* Header período */}
      <View
        style={{
          paddingHorizontal: 16,
          marginTop: 14,
          marginBottom: 8,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 18,
        }}
      >
        <Pressable onPress={prevPeriod} style={{ padding: 10 }}>
          <Text style={{ fontSize: 22, color: THEME.primary, fontWeight: "900" }}>{"<"}</Text>
        </Pressable>

        <Text style={{ fontWeight: "900", color: THEME.text, minWidth: 220, textAlign: "center" }}>
          {title}
        </Text>

        <Pressable onPress={nextPeriod} style={{ padding: 10 }}>
          <Text style={{ fontSize: 22, color: THEME.primary, fontWeight: "900" }}>{">"}</Text>
        </Pressable>
      </View>

      {/* ✅ Siempre scroll */}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* WEEK */}
        {mode === "week" ? (
          <>
            <FlatList
              ref={weekRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 12 }}
              data={weekDays}
              keyExtractor={(d) => dayKeyFromDate(d)}
              onScrollToIndexFailed={() => {
                setTimeout(() => {
                  const idx = weekDays.findIndex((d) => sameDay(d, today));
                  if (idx >= 0)
                    weekRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
                }, 250);
              }}
              renderItem={({ item }) => {
                const k = dayKeyFromDate(item);
                const isSel = sameDay(item, selected);
                const arr = weekByDay.get(k) ?? [];
                const total = arr.length;
                const hasFaculty = facultyDaysOfWeek.has(item.getDay());
                const facultyBlocks = getBlocksForDay(item.getDay());
                const exam = getExamForDay(k);

                return (
                  <Pressable
                    onPress={() => setSelected(item)}
                    style={{
                      backgroundColor: isSel ? THEME.primary : THEME.card,
                      borderWidth: hasFaculty && !isSel ? 2 : 1,
                      borderColor: exam
                        ? THEME.examBorder
                        : isSel
                        ? THEME.primary
                        : hasFaculty
                        ? THEME.facultyBorder
                        : THEME.border,
                      borderRadius: 18,
                      padding: 14,
                      width: 200,
                    }}
                  >
                    <Text style={{ color: isSel ? "#fff" : THEME.muted, fontWeight: "900", textAlign: "center" }}>
                      {item.toLocaleDateString("es-AR", { weekday: "short" }).toUpperCase()}
                    </Text>

                    <Text style={{ fontSize: 22, fontWeight: "900", color: isSel ? "#fff" : THEME.text, textAlign: "center" }}>
                      {item.getDate()}
                    </Text>

                    <Text style={{ color: isSel ? "#fff" : THEME.muted, fontWeight: "700", textAlign: "center" }}>
                      {total} turno{total === 1 ? "" : "s"}
                    </Text>

                    {/* Faculty chips */}
                    {facultyBlocks.map((fb) => (
                      <MiniChip
                        key={fb.id}
                        text={`📚 ${fb.label} • ${fb.startTime}-${fb.endTime}`}
                        inverted={isSel}
                        variant="faculty"
                      />
                    ))}

                    {/* Exam chip */}
                    {exam && (
                      <MiniChip
                        text={`📝 ${exam.label}`}
                        inverted={isSel}
                        variant="exam"
                      />
                    )}

                    <View style={{ marginTop: 6, alignItems: "center" }}>
                      {arr.slice(0, 6).map((ap: any) => {
                        const hh = fmtHour(ap);
                        const name = ap.clientNameSnapshot ?? "Clienta";
                        return <MiniChip key={ap.id} text={`${hh} • ${name}`} inverted={isSel} />;
                      })}
                      {total > 6 ? (
                        <Text style={{ marginTop: 6, color: isSel ? "#fff" : THEME.muted, fontWeight: "800", textAlign: "center" }}>
                          +{total - 6} más
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />

            {/* ═══ Horarios de Facultad (semanal) ═══ */}
            {sortedBlocks.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginTop: 16, alignItems: "center" }}>
                <View
                  style={{
                    width: "100%",
                    maxWidth: 560,
                    backgroundColor: THEME.facultySoft,
                    borderWidth: 1,
                    borderColor: THEME.facultyBorder,
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "900",
                      color: THEME.faculty,
                      fontSize: 15,
                      textAlign: "center",
                      marginBottom: 10,
                    }}
                  >
                    📚 Horarios de Facultad
                  </Text>

                  {sortedBlocks.map((b, idx) => (
                    <View
                      key={b.id}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 8,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: THEME.facultyBorder,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "900", color: THEME.faculty }}>
                          {weekdayName(b.dayOfWeek)}
                        </Text>
                        <Text style={{ fontWeight: "700", color: THEME.text, fontSize: 13, marginTop: 1 }}>
                          {b.label}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: "rgba(124,58,237,0.12)",
                          borderRadius: 999,
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                        }}
                      >
                        <Text style={{ fontWeight: "900", color: THEME.faculty, fontSize: 13 }}>
                          {b.startTime} - {b.endTime}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : null}

        {/* CALENDAR */}
        {mode === "calendar" ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 18, alignItems: "center" }}>
            <View style={{ width: "100%", maxWidth: 560 }}>
              {/* Header días */}
              <View style={{ flexDirection: "row", marginTop: 8, marginBottom: 10 }}>
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d, idx) => (
                  <View
                    key={d}
                    style={{
                      width: cellSize,
                      marginRight: idx === 5 ? 0 : GAP,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: THEME.muted, fontWeight: "900" }}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Grilla */}
              <View
                onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
                style={{ width: "100%" }}
              >
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {gridCells.map((d, idx) => {
                    const col = idx % 6;
                    const inMonth = d.getMonth() === anchor.getMonth();
                    const k = dayKeyFromDate(d);
                    const arr = monthByDay.get(k) ?? [];
                    const has = arr.length > 0;
                    const isToday = sameDay(d, today);
                    const hasFaculty = facultyDaysOfWeek.has(d.getDay());
                    const hasExam = examDayKeys.has(k);

                    // Determinar color de fondo de la celda
                    let cellBg = THEME.card;
                    let cellBorderColor = THEME.border;

                    if (hasExam) {
                      cellBg = THEME.examSoft;
                      cellBorderColor = THEME.examBorder;
                    } else if (hasFaculty) {
                      cellBg = THEME.facultySoft;
                      cellBorderColor = THEME.facultyBorder;
                    }

                    if (has && !hasFaculty && !hasExam) {
                      cellBg = THEME.primarySoft;
                      cellBorderColor = THEME.primary;
                    }

                    // Si tiene turnos Y facultad, fondo lavanda con borde primary
                    if (has && hasFaculty && !hasExam) {
                      cellBg = THEME.facultySoft;
                      cellBorderColor = THEME.primary;
                    }

                    return (
                      <View
                        key={k}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          marginRight: col === 5 ? 0 : GAP,
                          marginBottom: GAP,
                          padding: isToday ? 3 : 0,
                          borderRadius: isToday ? 16 : 0,
                          backgroundColor: isToday ? THEME.primary : "transparent",
                        }}
                      >
                        <Pressable
                          onPress={() => openDayModal(d)}
                          style={{
                            flex: 1,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: isToday ? "rgba(255,255,255,0.6)" : cellBorderColor,
                            backgroundColor: cellBg,
                            opacity: inMonth ? 1 : 0.45,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontWeight: "900",
                              color: hasExam
                                ? THEME.exam
                                : hasFaculty
                                ? THEME.faculty
                                : has
                                ? THEME.primary
                                : THEME.text,
                            }}
                          >
                            {d.getDate()}
                          </Text>

                          {/* Badge de turnos (solo reales, no Facultad) */}
                          {has ? (
                            <View
                              style={{
                                marginTop: 4,
                                backgroundColor: THEME.primary,
                                borderRadius: 999,
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                              }}
                            >
                              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 10 }}>
                                {arr.length}
                              </Text>
                            </View>
                          ) : null}

                          {/* Small faculty dot (only if no appointments badge) */}
                          {!has && hasFaculty && !hasExam && (
                            <View
                              style={{
                                marginTop: 4,
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: THEME.faculty,
                              }}
                            />
                          )}

                          {/* Small exam dot */}
                          {!has && hasExam && (
                            <View
                              style={{
                                marginTop: 4,
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: THEME.exam,
                              }}
                            />
                          )}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Leyenda */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 12,
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      backgroundColor: THEME.primarySoft,
                      borderWidth: 1,
                      borderColor: THEME.primary,
                    }}
                  />
                  <Text style={{ color: THEME.muted, fontWeight: "700", fontSize: 12 }}>
                    Turnos
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      backgroundColor: THEME.facultySoft,
                      borderWidth: 1,
                      borderColor: THEME.facultyBorder,
                    }}
                  />
                  <Text style={{ color: THEME.muted, fontWeight: "700", fontSize: 12 }}>
                    Facultad
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      backgroundColor: THEME.examSoft,
                      borderWidth: 1,
                      borderColor: THEME.examBorder,
                    }}
                  />
                  <Text style={{ color: THEME.muted, fontWeight: "700", fontSize: 12 }}>
                    Parcial
                  </Text>
                </View>
              </View>

              {/* Botón ver diario mensual */}
              <Pressable
                onPress={() => router.push("/(tabs)/calendar/month")}
                style={{
                  marginTop: 6,
                  backgroundColor: THEME.primary,
                  borderRadius: 18,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>Ver diario mensual</Text>
              </Pressable>

              {/* ═══ Horarios de Facultad (debajo del calendario) ═══ */}
              {sortedBlocks.length > 0 && (
                <View
                  style={{
                    marginTop: 16,
                    backgroundColor: THEME.facultySoft,
                    borderWidth: 1,
                    borderColor: THEME.facultyBorder,
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "900",
                      color: THEME.faculty,
                      fontSize: 15,
                      textAlign: "center",
                      marginBottom: 10,
                    }}
                  >
                    📚 Horarios de Facultad
                  </Text>

                  {sortedBlocks.map((b, idx) => (
                    <View
                      key={b.id}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 8,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: THEME.facultyBorder,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "900", color: THEME.faculty }}>
                          {weekdayName(b.dayOfWeek)}
                        </Text>
                        <Text style={{ fontWeight: "700", color: THEME.text, fontSize: 13, marginTop: 1 }}>
                          {b.label}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: "rgba(124,58,237,0.12)",
                          borderRadius: 999,
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                        }}
                      >
                        <Text style={{ fontWeight: "900", color: THEME.faculty, fontSize: 13 }}>
                          {b.startTime} - {b.endTime}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Modal día */}
            <Modal
              transparent
              visible={modalOpen}
              animationType="fade"
              onRequestClose={() => setModalOpen(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setModalOpen(false)}
                style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 18 }}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => {}}
                  style={{
                    backgroundColor: THEME.card,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    padding: 16,
                    alignItems: "center",
                    alignSelf: "center",
                    width: "100%",
                    maxWidth: 560,
                  }}
                >
                  <Text style={{ fontWeight: "900", fontSize: 16, color: THEME.text, textAlign: "center" }}>
                    {modalDay
                      ? modalDay.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" })
                      : ""}
                  </Text>

                  {/* Faculty info in modal */}
                  {modalFacultyBlocks.length > 0 && (
                    <View
                      style={{
                        marginTop: 10,
                        backgroundColor: THEME.facultySoft,
                        borderWidth: 1,
                        borderColor: THEME.facultyBorder,
                        borderRadius: 14,
                        padding: 10,
                        width: "100%",
                      }}
                    >
                      {modalFacultyBlocks.map((fb) => (
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

                  {/* Exam info in modal */}
                  {modalExam && (
                    <View
                      style={{
                        marginTop: 10,
                        backgroundColor: THEME.examSoft,
                        borderWidth: 1,
                        borderColor: THEME.examBorder,
                        borderRadius: 14,
                        padding: 10,
                        width: "100%",
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "900",
                          color: THEME.exam,
                          textAlign: "center",
                        }}
                      >
                        📝 {modalExam.label}
                        {modalExam.startTime && modalExam.endTime
                          ? ` • ${modalExam.startTime} - ${modalExam.endTime}`
                          : ""}
                      </Text>
                    </View>
                  )}

                  {modalTurns.length === 0 ? (
                    <Text style={{ marginTop: 10, color: THEME.muted, fontWeight: "700", textAlign: "center" }}>
                      Sin turnos
                    </Text>
                  ) : (
                    <View style={{ marginTop: 10, width: "100%" }}>
                      {modalTurns.map((ap: any) => (
                        <View
                          key={ap.id}
                          style={{
                            borderTopWidth: 1,
                            borderTopColor: THEME.border,
                            paddingVertical: 10,
                            width: "100%",
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ fontWeight: "900", color: THEME.primary, textAlign: "center" }}>
                            {fmtHour(ap)} • {ap.clientNameSnapshot}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Ver día */}
                  <Pressable
                    onPress={() => {
                      if (!modalDay) return;
                      setModalOpen(false);
                      router.push({
                        pathname: "/(tabs)/calendar/day",
                        params: { dayKey: dayKeyFromDate(modalDay) },
                      } as any);
                    }}
                    style={{
                      marginTop: 14,
                      backgroundColor: THEME.primary,
                      borderRadius: 18,
                      paddingVertical: 12,
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>Ver día</Text>
                  </Pressable>

                  {/* Agregar turno */}
                  <Pressable
                    onPress={() => {
                      if (!modalDay) return;
                      const date = ymd(modalDay);
                      setModalOpen(false);
                      router.push({
                        pathname: "/(tabs)/appointments",
                        params: { date },
                      } as any);
                    }}
                    style={{
                      marginTop: 10,
                      backgroundColor: THEME.primary,
                      borderRadius: 18,
                      paddingVertical: 12,
                      alignItems: "center",
                      width: "100%",
                      borderWidth: 1,
                      borderColor: THEME.border,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>
                      Agregar turno
                    </Text>
                  </Pressable>

                  {/* Cerrar */}
                  <Pressable
                    onPress={() => setModalOpen(false)}
                    style={{
                      marginTop: 10,
                      backgroundColor: THEME.primarySoft,
                      borderRadius: 18,
                      paddingVertical: 12,
                      alignItems: "center",
                      width: "100%",
                      borderWidth: 1,
                      borderColor: THEME.border,
                    }}
                  >
                    <Text style={{ color: THEME.primary, fontWeight: "900" }}>Cerrar</Text>
                  </Pressable>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}