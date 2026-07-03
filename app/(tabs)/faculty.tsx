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
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { THEME } from "../src/lib/theme";
import {
  useFacultySchedule,
  useExamDays,
  weekdayName,
} from "../src/hooks/useFacultySchedule";
import { dayKeyFromDate } from "../src/lib/keys";

const WEEKDAYS = [
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mié", value: 3 },
  { label: "Jue", value: 4 },
  { label: "Vie", value: 5 },
  { label: "Sáb", value: 6 },
];

function timeStringToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
  return d;
}

function dateToTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

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
        <Text style={s.inputSubLabel}>{label}</Text>
        <TextInput
          // @ts-ignore
          type="time"
          value={value}
          onChangeText={onChange}
          style={s.timeInputWeb}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={s.inputSubLabel}>{label}</Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[s.timeInputMobile, { borderColor }]}
      >
        <Text style={{ fontWeight: "800", color: THEME.text, fontSize: 14 }}>
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

function DatePickerField({
  label,
  value,
  onChange,
  onClear,
  borderColor = THEME.border,
}: {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  onClear: () => void;
  borderColor?: string;
}) {
  const isWeb = Platform.OS === "web";
  const [showPicker, setShowPicker] = React.useState(false);
  const [text, setText] = React.useState("");

  // Sincronizar el texto del input cuando el valor cambie externamente (solo si es una fecha válida)
  React.useEffect(() => {
    if (value && value instanceof Date && !isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      if (text !== dateStr) {
        setText(dateStr);
      }
    } else if (!value) {
      // Solo limpiar el texto si el valor es null y el input tenía una fecha completa
      if (text.length === 10) {
        setText("");
      }
    }
  }, [value]);

  const formatDateText = (inputText: string) => {
    const cleaned = inputText.replace(/\D/g, "");
    let formatted = "";
    if (cleaned.length > 0) {
      formatted += cleaned.substring(0, 4);
    }
    if (cleaned.length > 4) {
      formatted += "-" + cleaned.substring(4, 6);
    }
    if (cleaned.length > 6) {
      formatted += "-" + cleaned.substring(6, 8);
    }
    return formatted;
  };

  const handleTextChange = (inputText: string) => {
    const formatted = formatDateText(inputText);
    setText(formatted);

    if (formatted.length === 10) {
      const parts = formatted.split("-").map(Number);
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          onChange(date);
        }
      }
    } else if (inputText === "") {
      onClear();
    }
  };

  if (isWeb) {
    return (
      <View style={{ flex: 1, marginBottom: 14 }}>
        <Text style={s.inputSubLabel}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            value={text}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={THEME.muted}
            onChangeText={handleTextChange}
            maxLength={10}
            style={[s.textInput, { flex: 1, marginBottom: 0, borderColor }]}
          />
          {value && (
            <Pressable
              onPress={() => {
                setText("");
                onClear();
              }}
              style={{ padding: 4 }}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color={THEME.muted} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, marginBottom: 14 }}>
      <Text style={s.inputSubLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          value={text}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={THEME.muted}
          keyboardType="numeric"
          maxLength={10}
          onChangeText={handleTextChange}
          style={[
            s.textInput,
            {
              flex: 1,
              marginBottom: 0,
              borderColor,
              borderWidth: 1,
              padding: 10,
              borderRadius: 14,
              fontSize: 13,
              height: 48,
            },
          ]}
        />
        
        <Pressable
          onPress={() => setShowPicker(true)}
          style={{
            padding: 10,
            backgroundColor: THEME.bg,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 14,
            justifyContent: "center",
            alignItems: "center",
            height: 48,
            width: 48,
          }}
        >
          <MaterialCommunityIcons name="calendar" size={20} color={THEME.primary} />
        </Pressable>
        
        {value && (
          <Pressable
            onPress={() => {
              setText("");
              onClear();
            }}
            style={{ padding: 4 }}
          >
            <MaterialCommunityIcons name="close-circle" size={16} color={THEME.muted} />
          </Pressable>
        )}
      </View>

      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="default"
          onChange={(_, selected) => {
            setShowPicker(false);
            if (selected) onChange(selected);
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

  // Active sub-tab inside settings
  const [activeTab, setActiveTab] = React.useState<"schedule" | "exams">("schedule");

  // Block form state
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);
  const [blockStartTime, setBlockStartTime] = React.useState("14:00");
  const [blockEndTime, setBlockEndTime] = React.useState("18:00");
  const [blockLabel, setBlockLabel] = React.useState("");
  const [isSavingBlock, setIsSavingBlock] = React.useState(false);
  const [blockStartDateNative, setBlockStartDateNative] = React.useState<Date | null>(null);
  const [blockEndDateNative, setBlockEndDateNative] = React.useState<Date | null>(null);

  // Exam/Unique Day form state
  const [examDateNative, setExamDateNative] = React.useState<Date | null>(new Date());
  const [examLabel, setExamLabel] = React.useState("");
  const [examStartTime, setExamStartTime] = React.useState("08:00");
  const [examEndTime, setExamEndTime] = React.useState("12:00");
  const [isSavingExam, setIsSavingExam] = React.useState(false);
  const [examType, setExamType] = React.useState<"exam" | "unique">("exam");
  const [uniqueDescription, setUniqueDescription] = React.useState("");

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
      Alert.alert("Error", "Selecciona un día de la semana");
      return;
    }
    if (!blockLabel.trim()) {
      Alert.alert("Error", "Ingresa el nombre de la materia o cursada");
      return;
    }

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
        startDate: blockStartDateNative ? dayKeyFromDate(blockStartDateNative) : undefined,
        endDate: blockEndDateNative ? dayKeyFromDate(blockEndDateNative) : undefined,
      });
      setSelectedDay(null);
      setBlockLabel("");
      setBlockStartDateNative(null);
      setBlockEndDateNative(null);
      Alert.alert("Guardado", "Horario de cursada agregado correctamente 📚");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo guardar");
    } finally {
      setIsSavingBlock(false);
    }
  }

  async function handleDeleteBlock(blockId: string) {
    if (isWeb) {
      if (!confirm("¿Segura que deseas eliminar este horario de cursada?")) return;
      await removeBlock(blockId);
    } else {
      Alert.alert("Eliminar horario", "¿Seguro querés eliminar este horario de cursada?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => removeBlock(blockId) },
      ]);
    }
  }

  function dateToDayKey(d: Date): string {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  async function handleAddExam() {
    if (!examDateNative) {
      Alert.alert("Error", "Selecciona una fecha válida");
      return;
    }
    const dayKey = dateToDayKey(examDateNative);

    if (!examLabel.trim()) {
      Alert.alert("Error", examType === "exam" ? "Ingresa el nombre del examen" : "Ingresa el título");
      return;
    }

    setIsSavingExam(true);
    try {
      await addExam({
        date: dayKey,
        label: examLabel.trim(),
        startTime: examStartTime || undefined,
        endTime: examEndTime || undefined,
        description: examType === "unique" ? uniqueDescription.trim() : undefined,
        isUniqueDay: examType === "unique" ? true : undefined,
      });
      setExamDateNative(new Date());
      setExamLabel("");
      setUniqueDescription("");
      Alert.alert(
        "Guardado",
        examType === "exam"
          ? "Fecha de parcial agendada con éxito 📝"
          : "Día único guardado con éxito ✨"
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo guardar");
    } finally {
      setIsSavingExam(false);
    }
  }

  async function handleDeleteExam(examId: string) {
    if (isWeb) {
      if (!confirm("¿Segura que deseas eliminar este parcial?")) return;
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

  if (blocksLoading || examsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={THEME.faculty} />
        <Text style={{ marginTop: 12, color: THEME.muted, fontWeight: "700" }}>
          Cargando datos académicos...
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Screen Sub-Tabs Navigation */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, alignItems: "center" }}>
        <View style={s.tabSwitcher}>
          <Pressable
            onPress={() => setActiveTab("schedule")}
            style={[s.tabButton, activeTab === "schedule" && s.tabButtonActive]}
          >
            <Text style={[s.tabButtonText, activeTab === "schedule" && s.tabButtonTextActive]}>
              📅 Horarios de Clase
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("exams")}
            style={[s.tabButton, activeTab === "exams" && s.tabButtonActive]}
          >
            <Text style={[s.tabButtonText, activeTab === "exams" && s.tabButtonTextActive]}>
              📝 Exámenes / Día Especial
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 140,
          alignItems: "center",
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 520, gap: 18 }}>

          {/* TAB 1: SCHEDULE BLOCKS */}
          {activeTab === "schedule" && (
            <>
              {/* Context intro card */}
              <View style={[s.headerCard, { backgroundColor: THEME.facultySoft, borderColor: THEME.facultyBorder }]}>
                <MaterialCommunityIcons name="book-open-outline" size={24} color={THEME.faculty} />
                <Text style={[s.headerCardTitle, { color: THEME.faculty }]}>Cursadas Fijas</Text>
                <Text style={s.headerCardSubtitle}>
                  Agrega tus materias semanales. Se bloquearán automáticamente esos horarios en tu agenda.
                </Text>
              </View>

              {/* Existing schedule list card */}
              {blocks.length > 0 && (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Horarios Registrados</Text>
                  <View style={{ gap: 10 }}>
                    {blocks.map((b) => (
                      <View key={b.id} style={s.listItemRow}>
                        <View style={{ flex: 1, paddingRight: 6 }}>
                          <Text style={s.listItemDayName}>{weekdayName(b.dayOfWeek)}</Text>
                          <Text style={s.listItemLabel}>{b.label}</Text>
                          <Text style={s.listItemTime}>
                            ⏱ {b.startTime} - {b.endTime}
                            { (b.startDate || b.endDate) && (
                              ` • 📅 ${b.startDate ? formatDisplayDate(b.startDate) : "..."} al ${b.endDate ? formatDisplayDate(b.endDate) : "..."}`
                            )}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleDeleteBlock(b.id)}
                          style={s.deleteButton}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Add block form card */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Agregar Horario</Text>

                <Text style={s.inputLabel}>Día de la semana</Text>
                <View style={s.weekdayGrid}>
                  {WEEKDAYS.map((d) => (
                    <Pressable
                      key={d.value}
                      onPress={() => setSelectedDay(d.value)}
                      style={[
                        s.weekdayPill,
                        selectedDay === d.value && s.weekdayPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          s.weekdayPillText,
                          selectedDay === d.value && s.weekdayPillTextActive,
                        ]}
                      >
                        {d.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={s.inputLabel}>Nombre de la Materia</Text>
                <TextInput
                  value={blockLabel}
                  onChangeText={setBlockLabel}
                  placeholder="Ej: Anatomía, Fisiología..."
                  placeholderTextColor={THEME.muted}
                  style={s.textInput}
                />

                <View style={{ gap: 12, marginTop: 4, marginBottom: 12 }}>
                  <DatePickerField
                    label="Fecha Inicio (Opcional)"
                    value={blockStartDateNative}
                    onChange={setBlockStartDateNative}
                    onClear={() => setBlockStartDateNative(null)}
                  />
                  <DatePickerField
                    label="Fecha Fin (Opcional)"
                    value={blockEndDateNative}
                    onChange={setBlockEndDateNative}
                    onClear={() => setBlockEndDateNative(null)}
                  />
                </View>

                {/* Accesos rápidos para fechas */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2, marginBottom: 14, justifyContent: "center" }}>
                  <Pressable
                    onPress={() => setBlockStartDateNative(new Date())}
                    style={s.presetPill}
                  >
                    <Text style={s.presetPillText}>📅 Iniciar Hoy</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + 4);
                      setBlockEndDateNative(d);
                    }}
                    style={s.presetPill}
                  >
                    <Text style={s.presetPillText}>⏱ Fin en 4 Meses</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear(), 11, 31); // 31 Diciembre
                      setBlockEndDateNative(d);
                    }}
                    style={s.presetPill}
                  >
                    <Text style={s.presetPillText}>🎄 Fin de Año</Text>
                  </Pressable>
                  {(blockStartDateNative || blockEndDateNative) && (
                    <Pressable
                      onPress={() => {
                        setBlockStartDateNative(null);
                        setBlockEndDateNative(null);
                      }}
                      style={[s.presetPill, { backgroundColor: "rgba(223, 165, 89, 0.1)", borderColor: "rgba(223, 165, 89, 0.25)" }]}
                    >
                      <Text style={[s.presetPillText, { color: THEME.warning }]}>🧹 Limpiar Fechas</Text>
                    </Pressable>
                  )}
                </View>

                <View style={{ flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 16 }}>
                  <TimePickerField
                    label="Hora Inicio"
                    value={blockStartTime}
                    onChange={setBlockStartTime}
                  />
                  <TimePickerField
                    label="Hora Fin"
                    value={blockEndTime}
                    onChange={setBlockEndTime}
                  />
                </View>

                <Pressable
                  onPress={handleAddBlock}
                  disabled={isSavingBlock}
                  style={[s.submitButton, { backgroundColor: THEME.faculty }]}
                >
                  <Text style={s.submitButtonText}>
                    {isSavingBlock ? "Guardando..." : "＋ Agregar Horario de Clase"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* TAB 2: EXAMS & PARTIALS */}
          {activeTab === "exams" && (
            <>
              {/* Context intro card */}
              <View style={[s.headerCard, { backgroundColor: THEME.examSoft, borderColor: THEME.examBorder }]}>
                <MaterialCommunityIcons name="pencil-outline" size={24} color={THEME.exam} />
                <Text style={[s.headerCardTitle, { color: THEME.exam }]}>Exámenes y Eventos Especiales</Text>
                <Text style={s.headerCardSubtitle}>
                  Resalta tus fechas importantes de evaluación o días únicos en la agenda.
                </Text>
              </View>

              {/* Upcoming list card */}
              {upcomingExams.length > 0 && (
                <View style={s.card}>
                  <Text style={[s.cardTitle, { color: THEME.exam }]}>Próximos Exámenes y Días Especiales</Text>
                  <View style={{ gap: 10 }}>
                    {upcomingExams.map((e) => (
                      <View key={e.id} style={s.listItemRow}>
                        <View style={{ flex: 1, paddingRight: 6 }}>
                          <Text style={[s.listItemLabel, { fontSize: 15 }]}>
                            {e.isUniqueDay ? `✨ ${e.label}` : `📝 ${e.label}`}
                          </Text>
                          {e.isUniqueDay && e.description ? (
                            <Text style={{ color: THEME.text, fontSize: 13, fontWeight: "600", marginTop: 2 }}>
                              {e.description}
                            </Text>
                          ) : null}
                          <Text style={s.listItemTime}>
                            📅 {formatDisplayDate(e.date)} {e.startTime ? `• ⏱ ${e.startTime} - ${e.endTime}` : ""}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleDeleteExam(e.id)}
                          style={s.deleteButton}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Past exams collapse card */}
              {pastExams.length > 0 && (
                <View>
                  <Pressable
                    onPress={() => setShowPastExams((v) => !v)}
                    style={({ pressed }) => [
                      s.collapseButton,
                      { opacity: pressed ? 0.9 : 1 },
                    ]}
                  >
                    <Text style={{ fontWeight: "900", color: THEME.muted, fontSize: 13 }}>
                      📂 Ver Eventos Pasados ({pastExams.length})
                    </Text>
                    <MaterialCommunityIcons
                      name={showPastExams ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={THEME.muted}
                    />
                  </Pressable>

                  {showPastExams && (
                    <View style={[s.card, { marginTop: 8 }]}>
                      <View style={{ gap: 10 }}>
                        {pastExams.map((e) => (
                          <View key={e.id} style={s.listItemRow}>
                            <View style={{ flex: 1, paddingRight: 6 }}>
                              <Text style={[s.listItemLabel, { fontSize: 15, opacity: 0.6 }]}>
                                {e.isUniqueDay ? `✨ ${e.label}` : `📝 ${e.label}`}
                              </Text>
                              {e.isUniqueDay && e.description ? (
                                <Text style={{ color: THEME.text, fontSize: 13, fontWeight: "600", marginTop: 2, opacity: 0.6 }}>
                                  {e.description}
                                </Text>
                              ) : null}
                              <Text style={[s.listItemTime, { opacity: 0.6 }]}>
                                📅 {formatDisplayDate(e.date)}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => handleDeleteExam(e.id)}
                              style={s.deleteButton}
                            >
                              <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Add exam form card */}
              <View style={s.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <Text style={[s.cardTitle, { marginBottom: 0 }]}>
                    {examType === "exam" ? "Agendar Examen" : "Agendar Día Único"}
                  </Text>
                  
                  <View style={{ flexDirection: "row", gap: 6, backgroundColor: "rgba(233, 210, 220, 0.3)", padding: 2, borderRadius: 10 }}>
                    <Pressable
                      onPress={() => setExamType("exam")}
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        backgroundColor: examType === "exam" ? THEME.card : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "900", color: examType === "exam" ? THEME.text : THEME.muted }}>Examen</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setExamType("unique")}
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        backgroundColor: examType === "unique" ? THEME.card : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "900", color: examType === "unique" ? THEME.text : THEME.muted }}>Día Único</Text>
                    </Pressable>
                  </View>
                </View>

                <Text style={s.inputLabel}>Fecha</Text>
                <DatePickerField
                  label=""
                  value={examDateNative}
                  onChange={setExamDateNative}
                  onClear={() => setExamDateNative(null)}
                />

                <Text style={s.inputLabel}>
                  {examType === "exam" ? "Materia / Nombre de Examen" : "Título Personalizado"}
                </Text>
                <TextInput
                  value={examLabel}
                  onChangeText={setExamLabel}
                  placeholder={examType === "exam" ? "Ej: Final de Fisiología, Parcial..." : "Ej: Feriado, Vacaciones, Evento Especial..."}
                  placeholderTextColor={THEME.muted}
                  style={s.textInput}
                />

                {examType === "unique" && (
                  <>
                    <Text style={s.inputLabel}>Descripción Personalizada</Text>
                    <TextInput
                      value={uniqueDescription}
                      onChangeText={setUniqueDescription}
                      placeholder="Ej: Viaje familiar o día de descanso..."
                      placeholderTextColor={THEME.muted}
                      style={s.textInput}
                    />
                  </>
                )}

                <View style={{ flexDirection: "row", gap: 12, marginTop: 12, marginBottom: 16 }}>
                  <TimePickerField
                    label="Hora Inicio"
                    value={examStartTime}
                    onChange={setExamStartTime}
                  />
                  <TimePickerField
                    label="Hora Fin"
                    value={examEndTime}
                    onChange={setExamEndTime}
                  />
                </View>

                <Pressable
                  onPress={handleAddExam}
                  disabled={isSavingExam}
                  style={[s.submitButton, { backgroundColor: examType === "exam" ? THEME.exam : THEME.primary }]}
                >
                  <Text style={s.submitButtonText}>
                    {isSavingExam ? "Guardando..." : examType === "exam" ? "＋ Agendar Fecha de Examen" : "＋ Agendar Día Único"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingTop: Platform.OS === "ios" ? 44 : 20,
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
    fontSize: 13,
  },
  tabButtonTextActive: {
    color: THEME.text,
  },
  headerCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  headerCardTitle: {
    fontWeight: "900",
    fontSize: 16,
    marginTop: 8,
  },
  headerCardSubtitle: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  card: {
    width: "100%",
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    shadowColor: "#2E1E2F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  cardTitle: {
    fontWeight: "900",
    color: THEME.text,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  listItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(233, 210, 220, 0.4)",
  },
  listItemDayName: {
    fontWeight: "900",
    color: THEME.faculty,
    fontSize: 11,
    textTransform: "uppercase",
  },
  listItemLabel: {
    fontWeight: "900",
    color: THEME.text,
    fontSize: 14,
    marginTop: 2,
  },
  listItemTime: {
    fontWeight: "700",
    color: THEME.muted,
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.1)",
  },
  inputLabel: {
    fontWeight: "900",
    color: THEME.text,
    fontSize: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  weekdayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginBottom: 14,
  },
  weekdayPill: {
    backgroundColor: THEME.facultySoft,
    borderWidth: 1,
    borderColor: THEME.facultyBorder,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  weekdayPillActive: {
    backgroundColor: THEME.faculty,
    borderColor: THEME.faculty,
  },
  weekdayPillText: {
    fontWeight: "900",
    color: THEME.faculty,
    fontSize: 12,
  },
  weekdayPillTextActive: {
    color: "#fff",
  },
  presetPill: {
    backgroundColor: "rgba(212, 140, 158, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(212, 140, 158, 0.25)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  presetPillText: {
    fontWeight: "900",
    color: THEME.primary,
    fontSize: 11,
  },
  textInput: {
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 12,
    color: THEME.text,
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 14,
  },
  inputSubLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
    paddingLeft: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeInputWeb: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: THEME.bg,
    color: THEME.text,
    fontWeight: "900",
    textAlign: "center",
    fontSize: 15,
  },
  timeInputMobile: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: THEME.bg,
    alignItems: "center",
  },
  dateSelectorMobile: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: THEME.bg,
    alignItems: "center",
    marginBottom: 14,
  },
  collapseButton: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  submitButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    shadowColor: THEME.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
});
