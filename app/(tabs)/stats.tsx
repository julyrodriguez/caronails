import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  FlatList,
  SafeAreaView,
  useWindowDimensions,
  Platform,
  StyleSheet,
  Animated,
} from "react-native";

import AppHeader from "../src/components/AppHeader";
import { THEME } from "../src/lib/theme";
import { useMonthlyStats, useYearlyStats } from "../src/hooks/useStats";

function nowMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function fmtMoney(n: number) {
  return n.toLocaleString("es-AR");
}

export default function StatsScreen() {
  const [tab, setTab] = React.useState<"month" | "year">("month");
  const [monthKey, setMonthKey] = React.useState(() => nowMonthKey());
  const [year, setYear] = React.useState(() => new Date().getFullYear());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <View style={{ flex: 1, backgroundColor: THEME.bg, paddingTop: Platform.OS === "ios" ? 0 : 10 }}>

        {/* Tab Selector Capsule */}
        <View style={{ paddingHorizontal: 20, marginTop: 16, alignItems: "center" }}>
          <View style={s.tabContainer}>
            <Pressable
              onPress={() => setTab("month")}
              style={[s.tabButton, tab === "month" && s.tabButtonActive]}
            >
              <Text style={[s.tabText, tab === "month" && s.tabTextActive]}>
                Control Mensual
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("year")}
              style={[s.tabButton, tab === "year" && s.tabButtonActive]}
            >
              <Text style={[s.tabText, tab === "year" && s.tabTextActive]}>
                Balance Anual
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          {tab === "month" ? (
            <MonthlyView monthKey={monthKey} setMonthKey={setMonthKey} />
          ) : (
            <YearlyView year={year} setYear={setYear} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function MonthlyView({ monthKey, setMonthKey }: any) {
  const { incomePaid, incomePending, supplies, net, setMonthlySupplies } =
    useMonthlyStats(monthKey);

  const [supInput, setSupInput] = React.useState(String(supplies));
  React.useEffect(() => setSupInput(String(supplies)), [supplies]);

  function nextMonth() {
    const [y, m] = monthKey.split("-").map(Number);
    if (!y || !m) return;
    const date = new Date(y, m - 1, 1);
    date.setMonth(date.getMonth() + 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, "0");
    setMonthKey(`${newY}-${newM}`);
  }

  function prevMonth() {
    const [y, m] = monthKey.split("-").map(Number);
    if (!y || !m) return;
    const date = new Date(y, m - 1, 1);
    date.setMonth(date.getMonth() - 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, "0");
    setMonthKey(`${newY}-${newM}`);
  }

  const displayMonthName = React.useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number);
    if (!y || !m) return monthKey;
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  }, [monthKey]);

  async function saveSupplies() {
    const n = Number(supInput);
    if (!Number.isFinite(n) || n < 0) {
      Alert.alert("Insumos inválido", "El valor debe ser mayor o igual a 0.");
      return;
    }
    await setMonthlySupplies(n);
    Alert.alert("Guardado", "Insumos del mes actualizados correctamente 🌸");
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, alignItems: "center" }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: "100%", maxWidth: 520, gap: 18 }}>
        
        {/* Month Selector Form */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Período Seleccionado</Text>
          
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Pressable
              onPress={prevMonth}
              style={({ pressed }) => ({
                backgroundColor: THEME.primarySoft,
                borderRadius: 14,
                width: 44,
                height: 44,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: THEME.border,
                opacity: pressed ? 0.8 : 1,
              }) as any}
            >
              <Text style={{ fontSize: 20, color: THEME.primary, fontWeight: "900" }}>‹</Text>
            </Pressable>

            <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text, textTransform: "capitalize", flex: 1, textAlign: "center" }}>
              {displayMonthName}
            </Text>

            <Pressable
              onPress={nextMonth}
              style={({ pressed }) => ({
                backgroundColor: THEME.primarySoft,
                borderRadius: 14,
                width: 44,
                height: 44,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: THEME.border,
                opacity: pressed ? 0.8 : 1,
              }) as any}
            >
              <Text style={{ fontSize: 20, color: THEME.primary, fontWeight: "900" }}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* Dynamic circular balance visual header */}
        <View style={s.circleChartContainer}>
          <View style={s.circleOuterRing}>
            <View style={s.circleInnerFill}>
              <Text style={s.circleLabel}>Resultado Neto</Text>
              <Text style={s.circleValue}>${fmtMoney(net)}</Text>
              <Text style={s.circleSubtitle}>Ganancia del mes</Text>
            </View>
          </View>
        </View>

        {/* Detailed accounts list */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Detalle de Cuentas</Text>

          <View style={s.detailRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={[s.indicatorDot, { backgroundColor: THEME.success }]} />
              <Text style={s.detailTitle}>Ingresos Cobrados</Text>
            </View>
            <Text style={[s.detailPrice, { color: THEME.success }]}>${fmtMoney(incomePaid)}</Text>
          </View>

          <View style={s.detailRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={[s.indicatorDot, { backgroundColor: THEME.exam }]} />
              <Text style={s.detailTitle}>Pendiente por Cobrar</Text>
            </View>
            <Text style={[s.detailPrice, { color: THEME.exam }]}>${fmtMoney(incomePending)}</Text>
          </View>

          <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={[s.indicatorDot, { backgroundColor: "#DC2626" }]} />
              <Text style={s.detailTitle}>Gastos en Insumos</Text>
            </View>
            <Text style={[s.detailPrice, { color: "#DC2626" }]}>${fmtMoney(supplies)}</Text>
          </View>
        </View>

        {/* Supplies form input */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Cargar Insumos del Mes</Text>
          <TextInput
            value={supInput}
            onChangeText={setSupInput}
            keyboardType="numeric"
            inputMode="decimal"
            placeholder="Introduce los gastos de insumos..."
            placeholderTextColor={THEME.muted}
            style={[s.textInput, { marginBottom: 12 }]}
          />
          <Pressable onPress={saveSupplies} style={s.saveButton}>
            <Text style={s.saveButtonText}>Guardar Insumos</Text>
          </Pressable>
        </View>

      </View>
    </ScrollView>
  );
}

function YearlyView({ year, setYear }: any) {
  const { months, totalPaid, avgMonthly } = useYearlyStats(year);

  return (
    <FlatList
      style={{ flex: 1, width: "100%" }}
      data={months}
      keyExtractor={(it) => it.monthKey}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 120,
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
      }}
      ListHeaderComponent={
        <View style={{ width: "100%", gap: 18, marginBottom: 14 }}>
          {/* Year selector */}
          <View style={s.card}>
            <Text style={s.cardLabel}>Filtrar Año</Text>
            <TextInput
              value={String(year)}
              onChangeText={(v: string) => {
                const clean = v.replace(/[^\d]/g, "");
                const n = Number(clean);
                if (Number.isFinite(n)) setYear(n);
              }}
              keyboardType="numeric"
              inputMode="numeric"
              placeholder={String(new Date().getFullYear())}
              style={s.textInput}
            />
          </View>

          {/* Yearly summary cards */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[s.card, { flex: 1, alignItems: "center", paddingVertical: 18 }]}>
              <Text style={s.summaryLabel}>Total Cobrado</Text>
              <Text style={s.summaryValue}>${fmtMoney(totalPaid)}</Text>
            </View>
            <View style={[s.card, { flex: 1, alignItems: "center", paddingVertical: 18 }]}>
              <Text style={s.summaryLabel}>Promedio Mensual</Text>
              <Text style={s.summaryValue}>${fmtMoney(Math.round(avgMonthly))}</Text>
            </View>
          </View>

          <Text style={[s.cardLabel, { marginTop: 10, paddingLeft: 4 }]}>Mes a Mes</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ width: "100%", marginBottom: 8 }}>
          <View style={[s.card, { padding: 14 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 14, textTransform: "capitalize" }}>
                📅 {item.monthKey}
              </Text>
              <View style={s.gridPill}>
                <Text style={{ color: THEME.primary, fontWeight: "900", fontSize: 13 }}>
                  ${fmtMoney(item.paid)}
                </Text>
              </View>
            </View>
            <View style={s.gridSubTextRow}>
              <Text style={{ color: THEME.muted, fontWeight: "700", fontSize: 12 }}>
                Pendiente: ${fmtMoney(item.pending)}
              </Text>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  tabContainer: {
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
  tabText: {
    fontWeight: "900",
    color: THEME.muted,
    fontSize: 14,
  },
  tabTextActive: {
    color: THEME.text,
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
  cardLabel: {
    fontWeight: "900",
    color: THEME.text,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 2,
  },
  textInput: {
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 14,
    fontWeight: "800",
    color: THEME.text,
    textAlign: "center",
    fontSize: 15,
  },
  formatWarning: {
    color: THEME.exam,
    fontWeight: "700",
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
  formatSuccess: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
  circleChartContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 10,
  },
  circleOuterRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
    borderColor: THEME.primarySoft,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  circleInnerFill: {
    alignItems: "center",
    justifyContent: "center",
  },
  circleLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: THEME.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  circleValue: {
    fontSize: 26,
    fontWeight: "900",
    color: THEME.primary,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  circleSubtitle: {
    fontSize: 10,
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(233, 210, 220, 0.4)",
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.text,
  },
  detailPrice: {
    fontSize: 15,
    fontWeight: "900",
  },
  saveButton: {
    backgroundColor: THEME.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: THEME.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.text,
    marginTop: 4,
  },
  gridPill: {
    backgroundColor: THEME.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  gridSubTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(233, 210, 220, 0.3)",
    paddingTop: 8,
  },
});