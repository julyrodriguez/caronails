import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import AppHeader from "../src/components/AppHeader";
import AppFooter from "../src/components/AppFooter";
import { THEME } from "../src/lib/theme";
import {
  useFacultySchedule,
  useExamDays,
  weekdayName,
} from "../src/hooks/useFacultySchedule";

const WEEKDAYS = [
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mié", value: 3 },
  { label: "Jue", value: 4 },
  { label: "Vie", value: 5 },
  { label: "Sáb", value: 6 },
];

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View
      style={[
        {
          backgroundColor: THEME.card,
          borderWidth: 1,
          borderColor: THEME.border,
          borderRadius: 18,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontWeight: "900",
        color: THEME.text,
        fontSize: 16,
        marginTop: 8,
      }}
    >
      {children}
    </Text>
  );
}

// Helpers para parsear/formatear "HH:MM" ↔ Date
function timeStringToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
  return d;
}

function dateToTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Componente reutilizable para selección de hora (nativo en celular, texto en web)
function TimePickerField({
  label,
  value,
  onChange,
  borderColor = THEME.border,
}: {
  label: string;
  value: string;
  onChange: (time: string) => void;
  borderColor?: string;
}) {
  const isWeb = Platform.OS === "web";
  const [showPicker, setShowPicker] = React.useState(false);

  if (isWeb) {
    return (
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: THEME.muted,
            fontSize: 12,
            fontWeight: "700",
            marginBottom: 4,
          }}
        >
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="HH:MM"
          maxLength={5}
          style={{
            borderWidth: 1,
            borderColor,
            borderRadius: 14,
            padding: 12,
            backgroundColor: THEME.card,
            color: THEME.text,
            fontWeight: "900",
            textAlign: "center",
          }}
        />
      </View>
    );
  }

  // Nativo: botón que abre DateTimePicker en modo time
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: THEME.muted,
          fontSize: 12,
          fontWeight: "700",
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={{
          borderWidth: 2,
          borderColor,
          borderRadius: 14,
          padding: 12,
          backgroundColor: THEME.card,
          alignItems: "center",
        }}
      >
        <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 16 }}>
          {value || "—:—"}
        </Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={timeStringToDate(value)}
          mode="time"
          is24Hour
          display="spinner"
          onChange={(_, selected) => {
            setShowPicker(false);
            if (selected) onChange(dateToTimeString(selected));
          }}
        />
      )}
    </View>
  );
}

export default function FacultyScheduleScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const {
    blocks,
    loading: blocksLoading,
    addBlock,
    removeBlock,
  } = useFacultySchedule();

  const {
    exams,
    loading: examsLoading,
    addExam,
    removeExam,
  } = useExamDays();

  // ── Form state para nuevo bloque ──
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);
  const [blockStartTime, setBlockStartTime] = React.useState("14:00");
  const [blockEndTime, setBlockEndTime] = React.useState("18:00");
  const [blockLabel, setBlockLabel] = React.useState("");
  const [isSavingBlock, setIsSavingBlock] = React.useState(false);

  // ── Form state para nuevo parcial ──
  const [examDate, setExamDate] = React.useState(""); // DD/MM/YYYY (web)
  const [examDateNative, setExamDateNative] = React.useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [examLabel, setExamLabel] = React.useState("");
  const [examStartTime, setExamStartTime] = React.useState("08:00");
  const [examEndTime, setExamEndTime] = React.useState("12:00");
  const [isSavingExam, setIsSavingExam] = React.useState(false);

  // ── Parciales pasados colapsados ──
  const [showPastExams, setShowPastExams] = React.useState(false);

  const todayStr = React.useMemo(() => {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }, []);

  const { upcomingExams, pastExams } = React.useMemo(() => {
    const upcoming = exams.filter((e) => e.date >= todayStr);
    const past = exams.filter((e) => e.date < todayStr);
    return { upcomingExams: upcoming, pastExams: past };
  }, [exams, todayStr]);

  async function handleAddBlock() {
    if (selectedDay === null) {
      Alert.alert("Error", "Seleccioná un día de la semana");
      return;
    }
    if (!blockLabel.trim()) {
      Alert.alert("Error", "Ingresá el nombre de la materia");
      return;
    }

    // Validar horas
    const [sh, sm] = blockStartTime.split(":").map(Number);
    const [eh, em] = blockEndTime.split(":").map(Number);

    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
      Alert.alert("Error", "Las horas deben ser válidas");
      return;
    }
    if (sh > eh || (sh === eh && sm >= em)) {
      Alert.alert("Error", "La hora de fin debe ser posterior a la de inicio");
      return;
    }

    setIsSavingBlock(true);
    try {
      await addBlock({
        dayOfWeek: selectedDay,
        startTime: blockStartTime,
        endTime: blockEndTime,
        label: blockLabel.trim(),
        active: true,
      });
      setSelectedDay(null);
      setBlockLabel("");
      Alert.alert("Listo", "Horario agregado 📚");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo guardar");
    } finally {
      setIsSavingBlock(false);
    }
  }

  async function handleDeleteBlock(blockId: string) {
    if (isWeb) {
      if (!confirm("¿Eliminar este horario?")) return;
      await removeBlock(blockId);
    } else {
      Alert.alert("Eliminar horario", "¿Seguro querés eliminar este bloque?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => removeBlock(blockId) },
      ]);
    }
  }

  function parseDateInput(text: string): string | null {
    const m = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yy = Number(m[3]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  function dateToDayKey(d: Date): string {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  async function handleAddExam() {
    let dayKey: string | null;

    if (isWeb) {
      dayKey = parseDateInput(examDate);
      if (!dayKey) {
        Alert.alert("Error", "Ingresá la fecha en formato DD/MM/AAAA");
        return;
      }
    } else {
      dayKey = dateToDayKey(examDateNative);
    }

    if (!examLabel.trim()) {
      Alert.alert("Error", "Ingresá un nombre para el parcial");
      return;
    }

    setIsSavingExam(true);
    try {
      await addExam({
        date: dayKey,
        label: examLabel.trim(),
        startTime: examStartTime || undefined,
        endTime: examEndTime || undefined,
      });
      setExamDate("");
      setExamDateNative(new Date());
      setExamLabel("");
      Alert.alert("Listo", "Parcial agregado 📝");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo guardar");
    } finally {
      setIsSavingExam(false);
    }
  }

  async function handleDeleteExam(examId: string) {
    if (isWeb) {
      if (!confirm("¿Eliminar este parcial?")) return;
      await removeExam(examId);
    } else {
      Alert.alert("Eliminar parcial", "¿Seguro querés eliminar este parcial?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => removeExam(examId) },
      ]);
    }
  }

  function formatDisplayDate(dateStr: string) {
    const parts = dateStr.split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  }

  function ExamRow({ exam, idx }: { exam: (typeof exams)[0]; idx: number }) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
          borderTopWidth: idx === 0 ? 0 : 1,
          borderTopColor: THEME.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "900", color: THEME.exam }}>
            {exam.label}
          </Text>
          <Text style={{ fontWeight: "700", color: THEME.text, marginTop: 2 }}>
            {formatDisplayDate(exam.date)}
            {exam.startTime && exam.endTime
              ? ` • ${exam.startTime} - ${exam.endTime}`
              : ""}
          </Text>
        </View>
        <Pressable
          onPress={() => handleDeleteExam(exam.id)}
          style={{
            backgroundColor: "#FEE2E2",
            borderRadius: 999,
            paddingVertical: 6,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontWeight: "900", color: "#dc2626", fontSize: 13 }}>
            Eliminar
          </Text>
        </Pressable>
      </View>
    );
  }

  if (blocksLoading || examsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <AppHeader title="Facultad" subtitle="Horarios y Parciales" hideSettings />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={THEME.faculty} />
          <Text style={{ marginTop: 12, color: THEME.muted, fontWeight: "700" }}>
            Cargando...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <AppHeader title="Facultad" subtitle="Horarios y Parciales" hideSettings />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 110,
          alignItems: "center",
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 560, gap: 14 }}>
          {/* ═══════════════════════════════ HORARIOS SEMANALES ═══════════════════════════════ */}
          <Card
            style={{
              borderColor: THEME.facultyBorder,
              backgroundColor: THEME.facultySoft,
            }}
          >
            <Text
              style={{
                fontWeight: "900",
                color: THEME.faculty,
                fontSize: 18,
                textAlign: "center",
              }}
            >
              📚 Horarios Semanales
            </Text>
            <Text
              style={{
                marginTop: 6,
                color: THEME.muted,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Definí las materias y horarios de la facultad por día
            </Text>
          </Card>

          {/* Bloques existentes */}
          {blocks.length > 0 && (
            <Card>
              <Text
                style={{ fontWeight: "900", color: THEME.text, marginBottom: 10 }}
              >
                Horarios actuales
              </Text>
              {blocks.map((b, idx) => (
                <View
                  key={b.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: THEME.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "900", color: THEME.faculty }}>
                      {weekdayName(b.dayOfWeek)}
                    </Text>
                    <Text
                      style={{ fontWeight: "800", color: THEME.text, marginTop: 2 }}
                    >
                      {b.label}
                    </Text>
                    <Text
                      style={{
                        fontWeight: "700",
                        color: THEME.muted,
                        marginTop: 2,
                        fontSize: 13,
                      }}
                    >
                      {b.startTime} - {b.endTime}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteBlock(b.id)}
                    style={{
                      backgroundColor: "#FEE2E2",
                      borderRadius: 999,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text
                      style={{ fontWeight: "900", color: "#dc2626", fontSize: 13 }}
                    >
                      Eliminar
                    </Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          )}

          {/* Formulario nuevo bloque */}
          <SectionTitle>Agregar horario</SectionTitle>

          <Text style={{ fontWeight: "900", color: THEME.text }}>Día</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {WEEKDAYS.map((d) => (
              <Pressable
                key={d.value}
                onPress={() => setSelectedDay(d.value)}
                style={{
                  backgroundColor:
                    selectedDay === d.value ? THEME.faculty : THEME.facultySoft,
                  borderWidth: 1,
                  borderColor:
                    selectedDay === d.value ? THEME.faculty : THEME.facultyBorder,
                  borderRadius: 999,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    fontWeight: "900",
                    color: selectedDay === d.value ? "#fff" : THEME.faculty,
                  }}
                >
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontWeight: "900", color: THEME.text }}>Materia</Text>
          <TextInput
            value={blockLabel}
            onChangeText={setBlockLabel}
            placeholder="Ej: Matemática, Programación..."
            placeholderTextColor={THEME.muted}
            style={{
              borderWidth: 1,
              borderColor: THEME.facultyBorder,
              borderRadius: 14,
              padding: 12,
              backgroundColor: THEME.card,
              color: THEME.text,
              fontWeight: "700",
            }}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TimePickerField
              label="Hora inicio"
              value={blockStartTime}
              onChange={setBlockStartTime}
              borderColor={THEME.facultyBorder}
            />
            <TimePickerField
              label="Hora fin"
              value={blockEndTime}
              onChange={setBlockEndTime}
              borderColor={THEME.facultyBorder}
            />
          </View>

          <Pressable
            onPress={handleAddBlock}
            disabled={isSavingBlock}
            style={{
              backgroundColor: isSavingBlock ? THEME.border : THEME.faculty,
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
              opacity: isSavingBlock ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              {isSavingBlock ? "Guardando..." : "Agregar horario"}
            </Text>
          </Pressable>

          {/* ═══════════════════════════════ PARCIALES ═══════════════════════════════ */}
          <View style={{ height: 12 }} />

          <Card
            style={{
              borderColor: THEME.examBorder,
              backgroundColor: THEME.examSoft,
            }}
          >
            <Text
              style={{
                fontWeight: "900",
                color: THEME.exam,
                fontSize: 18,
                textAlign: "center",
              }}
            >
              📝 Parciales
            </Text>
            <Text
              style={{
                marginTop: 6,
                color: THEME.muted,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Marcá los días de parcial para verlos destacados en el calendario
            </Text>
          </Card>

          {/* Parciales próximos */}
          {upcomingExams.length > 0 && (
            <Card>
              <Text
                style={{ fontWeight: "900", color: THEME.exam, marginBottom: 10 }}
              >
                📌 Próximos parciales
              </Text>
              {upcomingExams.map((e, idx) => (
                <ExamRow key={e.id} exam={e} idx={idx} />
              ))}
            </Card>
          )}

          {/* Parciales pasados (colapsable) */}
          {pastExams.length > 0 && (
            <View>
              <Pressable
                onPress={() => setShowPastExams((v) => !v)}
                style={{
                  backgroundColor: THEME.card,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 18,
                  padding: 14,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900", color: THEME.muted }}>
                  📂 Parciales anteriores ({pastExams.length})
                </Text>
                <Text
                  style={{ fontWeight: "900", color: THEME.muted, fontSize: 16 }}
                >
                  {showPastExams ? "▲" : "▼"}
                </Text>
              </Pressable>

              {showPastExams && (
                <Card style={{ marginTop: 8 }}>
                  {pastExams.map((e, idx) => (
                    <ExamRow key={e.id} exam={e} idx={idx} />
                  ))}
                </Card>
              )}
            </View>
          )}

          {/* Formulario nuevo parcial */}
          <SectionTitle>Agregar parcial</SectionTitle>

          <Text style={{ fontWeight: "900", color: THEME.text }}>Fecha</Text>
          {isWeb ? (
            <TextInput
              value={examDate}
              onChangeText={setExamDate}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              placeholderTextColor={THEME.muted}
              style={{
                borderWidth: 1,
                borderColor: THEME.examBorder,
                borderRadius: 14,
                padding: 12,
                backgroundColor: THEME.card,
                color: THEME.text,
                fontWeight: "900",
                textAlign: "center",
              }}
            />
          ) : (
            <>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={{
                  borderWidth: 2,
                  borderColor: THEME.examBorder,
                  borderRadius: 14,
                  padding: 12,
                  backgroundColor: THEME.card,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 16 }}>
                  {examDateNative.toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={examDateNative}
                  mode="date"
                  display="default"
                  onChange={(_, selected) => {
                    setShowDatePicker(false);
                    if (selected) setExamDateNative(selected);
                  }}
                />
              )}
            </>
          )}

          <Text style={{ fontWeight: "900", color: THEME.text }}>
            Nombre del parcial
          </Text>
          <TextInput
            value={examLabel}
            onChangeText={setExamLabel}
            placeholder="Parcial Matemática"
            placeholderTextColor={THEME.muted}
            style={{
              borderWidth: 1,
              borderColor: THEME.examBorder,
              borderRadius: 14,
              padding: 12,
              backgroundColor: THEME.card,
              color: THEME.text,
              fontWeight: "700",
            }}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TimePickerField
              label="Hora inicio"
              value={examStartTime}
              onChange={setExamStartTime}
              borderColor={THEME.examBorder}
            />
            <TimePickerField
              label="Hora fin"
              value={examEndTime}
              onChange={setExamEndTime}
              borderColor={THEME.examBorder}
            />
          </View>

          <Pressable
            onPress={handleAddExam}
            disabled={isSavingExam}
            style={{
              backgroundColor: isSavingExam ? THEME.border : THEME.exam,
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
              opacity: isSavingExam ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              {isSavingExam ? "Guardando..." : "Agregar parcial"}
            </Text>
          </Pressable>


        </View>
      </ScrollView>

      <AppFooter showMenu menuHref={"/(tabs)/calendar" as any} showBack />
    </View>
  );
}
