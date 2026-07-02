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
  StyleSheet,
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

function ymd(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

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
  const { width: winWidth } = useWindowDimensions();

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [mode, setMode] = React.useState<"week" | "calendar">("week");
  const [anchor, setAnchor] = React.useState<Date>(() => new Date());
  const [selected, setSelected] = React.useState<Date>(() => new Date());

  const weekRef = React.useRef<FlatList<Date>>(null);

  // Hooks de datos
  const { blocks, facultyDaysOfWeek, getBlocksForDay } = useFacultySchedule();
  const { exams, examDayKeys, getExamForDay } = useExamDays();

  const nextUpcomingExam = React.useMemo(() => {
    const todayStr = ymd(today);
    const futures = exams.filter((e) => e.date >= todayStr);
    return futures[0] ?? null;
  }, [exams, today]);

  const daysUntilExam = React.useMemo(() => {
    if (!nextUpcomingExam) return null;
    const examDate = new Date(nextUpcomingExam.date + "T00:00:00");
    const diffTime = examDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [nextUpcomingExam, today]);

  React.useEffect(() => {
    setAnchor(new Date(today));
    setSelected(new Date(today));
  }, [today]);

  const weekDays = weekDaysMonToSat(anchor);
  const weekStart = weekDays[0];
  const weekEndExclusive = new Date(weekDays[5]);
  weekEndExclusive.setDate(weekEndExclusive.getDate() + 1);

  const { items: weekItems } = useAppointmentsByRange(weekStart, weekEndExclusive);

  const weekByDay = React.useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of weekItems as any[]) {
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

  const monthStart = startOfMonth(anchor);
  const monthEndExclusive = startOfNextMonth(anchor);
  const { items: monthItems } = useAppointmentsByRange(monthStart, monthEndExclusive);

  const monthByDay = React.useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of monthItems as any[]) {
      if (it.clientNameSnapshot === "Facultad") continue;
      const k = it.dayKey;
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }
    return map;
  }, [monthItems]);

  const { cells: gridCells } = React.useMemo(
    () => buildMonthGridMonToSat(anchor),
    [anchor]
  );

  const GAP = 6;
  const [gridWidth, setGridWidth] = React.useState(0);

  const safeGridWidth = React.useMemo(() => {
    if (gridWidth > 0) return gridWidth;
    return Math.min(winWidth - 32, 540);
  }, [gridWidth, winWidth]);

  const cellSize = React.useMemo(() => {
    const w = safeGridWidth;
    return Math.max(42, Math.floor((w - GAP * 5) / 6));
  }, [safeGridWidth]);

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

  const periodTitle =
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
        if (idx >= 0) {
          try {
            weekRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
          } catch {}
        }
      });
    }
  }, [mode]);

  const currentDayKey = dayKeyFromDate(selected);
  const selectedDayTurns = weekByDay.get(currentDayKey) ?? [];
  const selectedDayExam = getExamForDay(currentDayKey);
  const selectedDayFaculty = getBlocksForDay(selected.getDay());

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === "ios" ? 44 : 20 }}>
      {/* Modern Gradient Hero Welcome Block */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, alignItems: "center" }}>
        <View style={s.heroBanner}>
          <Text style={s.heroTitle}>Hola, Caro ✨</Text>
          
          <View style={s.heroBadgeContainer}>
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeText}>
                {selectedDayTurns.length} Turno{selectedDayTurns.length === 1 ? "" : "s"} hoy
              </Text>
            </View>
            {selectedDayExam && (
              <View style={[s.heroBadge, { backgroundColor: THEME.exam }]}>
                <Text style={s.heroBadgeText}>📚 ¡Hoy rindes!</Text>
              </View>
            )}
          </View>

          {/* Countdown widget */}
          {nextUpcomingExam && daysUntilExam !== null && (
            <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.18)", width: "100%", alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                anuncios importantes:
              </Text>
              <Text style={{ fontSize: 13, color: "#fff", fontWeight: "900", textAlign: "center" }} numberOfLines={1}>
                📚 {nextUpcomingExam.label}: {daysUntilExam === 0
                  ? "¡ES HOY! 🍀✨"
                  : daysUntilExam === 1
                  ? "¡Mañana! 📖"
                  : `Faltan ${daysUntilExam} días`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs navigation pill container */}
      <View style={{ paddingHorizontal: 20, marginTop: 16, alignItems: "center" }}>
        <View style={s.tabSwitcher}>
          <Pressable
            onPress={() => setMode("week")}
            style={[s.tabButton, mode === "week" && s.tabButtonActive]}
          >
            <Text style={[s.tabButtonText, mode === "week" && s.tabButtonTextActive]}>
              Vista Semanal
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("calendar")}
            style={[s.tabButton, mode === "calendar" && s.tabButtonActive]}
          >
            <Text style={[s.tabButtonText, mode === "calendar" && s.tabButtonTextActive]}>
              Vista Mensual
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Date Switch Navigator */}
      <View style={s.dateNavigatorContainer}>
        <Pressable onPress={prevPeriod} style={s.dateNavArrow}>
          <Text style={{ fontSize: 20, color: THEME.primary, fontWeight: "900" }}>{"‹"}</Text>
        </Pressable>

        <Text style={s.dateNavTitle}>{periodTitle}</Text>

        <Pressable onPress={nextPeriod} style={s.dateNavArrow}>
          <Text style={{ fontSize: 20, color: THEME.primary, fontWeight: "900" }}>{"›"}</Text>
        </Pressable>
      </View>

      {/* Main timeline / grilla wrapper */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* WEEK VIEW (Completely redesign into timeline layout) */}
        {mode === "week" ? (
          <View style={{ gap: 20 }}>
            {/* Day horizontal selectors styled as floating bubbles */}
            <FlatList
              ref={weekRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4, gap: 10 }}
              data={weekDays}
              keyExtractor={(d) => dayKeyFromDate(d)}
              getItemLayout={(data, index) => ({
                length: 74,
                offset: 84 * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  try {
                    weekRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                  } catch {}
                }, 100);
              }}
              renderItem={({ item }) => {
                const k = dayKeyFromDate(item);
                const isSel = sameDay(item, selected);
                const arr = weekByDay.get(k) ?? [];
                const hasExam = getExamForDay(k);
                const hasFaculty = facultyDaysOfWeek.has(item.getDay());

                return (
                  <Pressable
                    onPress={() => setSelected(item)}
                    style={[
                      s.dayBubble,
                      isSel && s.dayBubbleActive,
                      arr.length > 0 && !isSel && { borderColor: THEME.primary, borderWidth: 2 },
                      hasFaculty && !isSel && { borderColor: THEME.faculty, borderWidth: 2 },
                      hasExam && !isSel && { borderColor: THEME.exam, borderWidth: 2 },
                    ] as any}
                  >
                    <Text style={[s.dayBubbleWeek, isSel && s.dayBubbleActiveText]}>
                      {item.toLocaleDateString("es-AR", { weekday: "short" }).toUpperCase()}
                    </Text>
                    <Text style={[s.dayBubbleDayNum, isSel && s.dayBubbleActiveText]}>
                      {item.getDate()}
                    </Text>
                    
                    {/* Dots indicator inside day bubble */}
                    <View style={{ flexDirection: "row", gap: 3, marginTop: 4 }}>
                      {arr.length > 0 && <View style={[s.dotIndicator, isSel && { backgroundColor: "#fff" }]        } />}
                      {hasFaculty && <View style={[s.dotIndicator, { backgroundColor: isSel ? "#fff" : THEME.faculty }]} />}
                      {hasExam && <View style={[s.dotIndicator, { backgroundColor: isSel ? "#fff" : THEME.exam }]} />}
                    </View>
                  </Pressable>
                );
              }}
            />

            {/* Selected day professional TIMELINE list */}
            <View style={{ paddingHorizontal: 20, alignItems: "center" }}>
              <View style={s.timelineCard}>
                <View style={s.timelineHeader}>
                  <Text style={s.timelineHeaderDate}>
                    {selected.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" })}
                  </Text>
                  
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/calendar/day",
                        params: { dayKey: currentDayKey },
                      } as any)
                    }
                    style={s.timelineHeaderLink}
                  >
                    <Text style={s.timelineHeaderLinkText}>Ver balances 💵</Text>
                  </Pressable>
                </View>

                {/* The visual line list layout */}
                {selectedDayTurns.length === 0 && !selectedDayExam && selectedDayFaculty.length === 0 ? (
                  <View style={{ paddingVertical: 32, alignItems: "center" }}>
                    <Text style={{ fontSize: 28, marginBottom: 8 }}>🌸</Text>
                    <Text style={{ color: THEME.muted, fontWeight: "800", fontSize: 14 }}>
                      Sin compromisos agendados
                    </Text>
                  </View>
                ) : (
                  <View style={{ paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: "rgba(184, 138, 159, 0.2)", gap: 14, marginVertical: 8 }}>
                    
                    {/* 1. Academic items first */}
                    {selectedDayFaculty.map((fb) => (
                      <View key={fb.id} style={s.timelineItem}>
                        <View style={[s.timelinePin, { backgroundColor: THEME.faculty }]} />
                        <View style={[s.timelineContent, { backgroundColor: THEME.facultySoft, borderColor: THEME.facultyBorder }]}>
                          <Text style={[s.timelineLabel, { color: THEME.faculty }]}>📚 CLASE FRESCA</Text>
                          <Text style={s.timelineTitle}>{fb.label}</Text>
                          <Text style={s.timelineTime}>{fb.startTime} - {fb.endTime}</Text>
                        </View>
                      </View>
                    ))}

                    {selectedDayExam && (
                      <View style={s.timelineItem}>
                        <View style={[s.timelinePin, { backgroundColor: THEME.exam }]} />
                        <View style={[s.timelineContent, { backgroundColor: THEME.examSoft, borderColor: THEME.examBorder }]}>
                          <Text style={[s.timelineLabel, { color: THEME.exam }]}>📝 EXAMEN / PARCIAL</Text>
                          <Text style={s.timelineTitle}>{selectedDayExam.label}</Text>
                          <Text style={s.timelineTime}>
                            {selectedDayExam.startTime ? `${selectedDayExam.startTime} - ${selectedDayExam.endTime}` : "Todo el día"}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* 2. Appointments */}
                    {selectedDayTurns.map((ap: any) => (
                      <Pressable
                        key={ap.id}
                        onPress={() =>
                          router.push({
                            pathname: "/appointments/[appointmentId]",
                            params: { appointmentId: ap.id, backTo: "calendar" },
                          } as any)
                        }
                        style={s.timelineItem}
                      >
                        <View style={[s.timelinePin, { backgroundColor: THEME.primary }]} />
                        <View style={s.timelineContent}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <View style={{ flex: 1, paddingRight: 6 }}>
                              <Text style={[s.timelineLabel, { color: THEME.primary }]}>💅 CITA CLIENTA</Text>
                              <Text style={s.timelineTitle}>{ap.clientNameSnapshot}</Text>
                              {ap.description ? (
                                <Text style={s.timelineSubtitle} numberOfLines={1}>
                                  {ap.description}
                                </Text>
                              ) : null}
                            </View>
                            
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={s.timelinePrice}>${ap.amount}</Text>
                              <Text style={[s.timelinePaidText, { color: ap.paid ? THEME.success : THEME.exam }]}>
                                {ap.paid ? "Cobrado ✓" : "Impago"}
                              </Text>
                            </View>
                          </View>
                          
                          <Text style={[s.timelineTime, { marginTop: 6 }]}>⏱ {fmtHour(ap)}</Text>
                        </View>
                      </Pressable>
                    ))}

                  </View>
                )}

                {/* Add turn button */}
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/appointments",
                      params: { date: ymd(selected) },
                    } as any)
                  }
                  style={s.timelineAddButton}
                >
                  <Text style={s.timelineAddButtonText}>＋ Agendar Nuevo Turno</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {/* MONTH VIEW (Completely redesigned grid) */}
        {mode === "calendar" ? (
          <View style={{ paddingHorizontal: 20, alignItems: "center" }}>
            <View style={s.gridContainer}>
              
              {/* Header labels */}
              <View style={s.gridHeaderRow}>
                {["L", "M", "M", "J", "V", "S"].map((l, i) => (
                  <View key={i} style={{ width: cellSize, alignItems: "center" }}>
                    <Text style={s.gridHeaderLabel}>{l}</Text>
                  </View>
                ))}
              </View>

              {/* Grid content */}
              <View
                onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
                style={{ width: "100%" }}
              >
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                  {gridCells.map((d) => {
                    const inMonth = d.getMonth() === anchor.getMonth();
                    const k = dayKeyFromDate(d);
                    const arr = monthByDay.get(k) ?? [];
                    const has = arr.length > 0;
                    const isToday = sameDay(d, today);
                    const hasFaculty = facultyDaysOfWeek.has(d.getDay());
                    const hasExam = examDayKeys.has(k);

                    return (
                      <View
                        key={k}
                        style={{
                          width: cellSize,
                          height: cellSize + 8,
                          marginBottom: GAP,
                          alignItems: "center",
                          opacity: inMonth ? 1 : 0.35,
                        }}
                      >
                        <Pressable
                          onPress={() => openDayModal(d)}
                          style={[
                            s.gridCell,
                            { width: cellSize, height: cellSize },
                            isToday && s.gridCellToday,
                            has && !isToday && s.gridCellHasTurns,
                            hasFaculty && !has && !isToday && s.gridCellHasFaculty,
                            hasExam && !has && !isToday && s.gridCellHasExam,
                          ]}
                        >
                          <Text
                            style={[
                              s.gridCellText,
                              isToday && s.gridCellTodayText,
                              has && !isToday && { color: THEME.primary },
                              hasFaculty && !has && !isToday && { color: THEME.faculty },
                              hasExam && !has && !isToday && { color: THEME.exam },
                            ]}
                          >
                            {d.getDate()}
                          </Text>

                          {/* Minimal dot list inside date box */}
                          <View style={{ flexDirection: "row", gap: 3, marginTop: 4 }}>
                            {has && <View style={[s.miniDot, { backgroundColor: isToday ? "#fff" : THEME.primary }]} />}
                            {hasFaculty && <View style={[s.miniDot, { backgroundColor: isToday ? "#fff" : THEME.faculty }]} />}
                            {hasExam && <View style={[s.miniDot, { backgroundColor: isToday ? "#fff" : THEME.exam }]} />}
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Minimal modern color code key bar */}
              <View style={s.legendRow}>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: THEME.primary }]} />
                  <Text style={s.legendLabel}>Turnos</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: THEME.faculty }]} />
                  <Text style={s.legendLabel}>Facultad</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: THEME.exam }]} />
                  <Text style={s.legendLabel}>Parcial</Text>
                </View>
              </View>

              {/* Action: view month list */}
              <Pressable
                onPress={() => router.push("/(tabs)/calendar/month")}
                style={s.gridListButton}
              >
                <Text style={s.gridListButtonText}>Ver Listado del Diario Mensual</Text>
              </Pressable>

            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Web bottom overlay styled calendar details modal */}
      <Modal
        transparent
        visible={modalOpen}
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalOpen(false)}
          style={s.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={s.modalSheet}
          >
            {/* Drag Handle Bar */}
            <View style={s.modalDragHandle} />

            <Text style={s.modalDateTitle}>
              {modalDay ? modalDay.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" }) : ""}
            </Text>

            {/* Banner elements */}
            {modalFacultyBlocks.length > 0 && (
              <View style={[s.modalBannerBlock, { backgroundColor: THEME.facultySoft, borderColor: THEME.facultyBorder }]}>
                {modalFacultyBlocks.map((fb) => (
                  <Text key={fb.id} style={{ fontWeight: "800", color: THEME.faculty, fontSize: 13 }}>
                    📚 Clase: {fb.label} ({fb.startTime} - {fb.endTime})
                  </Text>
                ))}
              </View>
            )}

            {modalExam && (
              <View style={[s.modalBannerBlock, { backgroundColor: THEME.examSoft, borderColor: THEME.examBorder }]}>
                <Text style={{ fontWeight: "800", color: THEME.exam, fontSize: 13 }}>
                  📝 Examen: {modalExam.label} {modalExam.startTime ? `(${modalExam.startTime})` : ""}
                </Text>
              </View>
            )}

            {/* List */}
            {modalTurns.length === 0 ? (
              <Text style={s.modalEmptyText}>No hay citas programadas para esta fecha.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
                <View style={{ gap: 8 }}>
                  {modalTurns.map((ap: any) => (
                    <View key={ap.id} style={s.modalTurnCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 14 }}>
                          ⏱ {fmtHour(ap)} • {ap.clientNameSnapshot}
                        </Text>
                        {ap.description ? (
                          <Text style={{ color: THEME.muted, fontSize: 12, marginTop: 2, fontWeight: "600" }}>
                            {ap.description}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontWeight: "900", color: THEME.primary, fontSize: 14 }}>
                          ${ap.amount}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: ap.paid ? THEME.success : THEME.exam }}>
                          {ap.paid ? "Cobrado" : "Impago"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Action options */}
            <View style={{ gap: 8, marginTop: 14 }}>
              <Pressable
                onPress={() => {
                  if (!modalDay) return;
                  setModalOpen(false);
                  router.push({
                    pathname: "/(tabs)/calendar/day",
                    params: { dayKey: dayKeyFromDate(modalDay) },
                  } as any);
                }}
                style={s.modalActionBtn}
              >
                <Text style={s.modalActionBtnText}>Ver detalles y totales diario</Text>
              </Pressable>

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
                style={[s.modalActionBtn, { backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.primary }] as any}
              >
                <Text style={[s.modalActionBtnText, { color: THEME.primary }] as any}>＋ Agregar Turno</Text>
              </Pressable>
            </View>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  heroBanner: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: THEME.primary,
    borderRadius: 28,
    padding: 24,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    alignItems: "center",
    ...Platform.select({
      web: {
        backgroundImage: "linear-gradient(135deg, #B88A9F 0%, #A6768C 100%)",
      },
    }),
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  heroBadgeContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    justifyContent: "center",
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  tabSwitcher: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(233, 210, 220, 0.3)",
    borderRadius: 18,
    padding: 4,
    width: "100%",
    maxWidth: 520,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: THEME.card,
    shadowColor: THEME.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  tabButtonText: {
    fontWeight: "900",
    color: THEME.muted,
    fontSize: 14,
  },
  tabButtonTextActive: {
    color: THEME.text,
  },
  dateNavigatorContainer: {
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  dateNavArrow: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  dateNavTitle: {
    fontWeight: "900",
    color: THEME.text,
    fontSize: 16,
    textTransform: "capitalize",
    textAlign: "center",
    flex: 1,
  },
  dayBubble: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 22,
    width: 64,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2E1E2F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  dayBubbleActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  dayBubbleWeek: {
    fontSize: 10,
    fontWeight: "900",
    color: THEME.muted,
  },
  dayBubbleDayNum: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.text,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  dayBubbleActiveText: {
    color: "#fff",
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  timelineCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: THEME.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    shadowColor: "#2E1E2F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(233, 210, 220, 0.4)",
    paddingBottom: 12,
    marginBottom: 16,
  },
  timelineHeaderDate: {
    fontWeight: "900",
    color: THEME.text,
    fontSize: 15,
    textTransform: "capitalize",
  },
  timelineHeaderLink: {
    backgroundColor: THEME.primarySoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  timelineHeaderLinkText: {
    color: THEME.primary,
    fontWeight: "900",
    fontSize: 12,
  },
  timelineItem: {
    position: "relative",
    paddingLeft: 16,
  },
  timelinePin: {
    position: "absolute",
    left: -19,
    top: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: THEME.card,
  },
  timelineContent: {
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 14,
  },
  timelineLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  timelineTitle: {
    fontWeight: "900",
    color: THEME.text,
    fontSize: 15,
    marginTop: 2,
  },
  timelineSubtitle: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  timelineTime: {
    fontWeight: "700",
    color: THEME.muted,
    fontSize: 12,
    marginTop: 4,
  },
  timelinePrice: {
    fontWeight: "900",
    color: THEME.primary,
    fontSize: 15,
  },
  timelinePaidText: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  timelineAddButton: {
    backgroundColor: THEME.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  timelineAddButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  gridContainer: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: THEME.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    shadowColor: "#2E1E2F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  gridHeaderRow: {
    flexDirection: "row",
    marginBottom: 10,
    justifyContent: "space-between",
  },
  gridHeaderLabel: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 13,
  },
  gridCell: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCellToday: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  gridCellTodayText: {
    color: "#fff",
    fontWeight: "900",
  },
  gridCellHasTurns: {
    backgroundColor: "#FFE5EA", // Much richer high-contrast pink
    borderColor: THEME.primary,
    borderWidth: 2,
  },
  gridCellHasFaculty: {
    backgroundColor: "#EFEBFC", // Richer high-contrast purple
    borderColor: THEME.faculty,
    borderWidth: 2,
  },
  gridCellHasExam: {
    backgroundColor: "#FFEADF", // Richer high-contrast peach
    borderColor: THEME.exam,
    borderWidth: 2,
  },
  gridCellText: {
    fontWeight: "900",
    fontSize: 14,
    color: THEME.text,
  },
  miniDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 12,
  },
  gridListButton: {
    backgroundColor: THEME.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  gridListButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(46, 30, 47, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#2E1E2F",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(184, 138, 159, 0.25)",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalDateTitle: {
    fontWeight: "900",
    fontSize: 18,
    color: THEME.text,
    textAlign: "center",
    textTransform: "capitalize",
    marginBottom: 12,
  },
  modalBannerBlock: {
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  modalEmptyText: {
    marginVertical: 20,
    color: THEME.muted,
    fontWeight: "700",
    textAlign: "center",
    fontSize: 13,
  },
  modalTurnCard: {
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalActionBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalActionBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
});