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
} from "react-native";

import AppHeader from "../src/components/AppHeader";
import { THEME } from "../src/lib/theme";
import { useMonthlyStats, useYearlyStats } from "../src/hooks/useStats";

function nowMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function Pill({ label, active, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.pill,
        {
          backgroundColor: active ? THEME.primary : THEME.primarySoft,
          borderColor: active ? THEME.primary : THEME.border,
        },
      ]}
    >
      <Text style={{ fontWeight: "900", color: active ? "#fff" : THEME.primary, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: THEME.card,
          borderColor: THEME.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontWeight: "900", color: THEME.text, textAlign: "center" }}>{children}</Text>;
}

function Input(props: any) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={THEME.muted}
      style={[
        s.input,
        {
          backgroundColor: THEME.primarySoft,
          borderColor: THEME.border,
          color: THEME.text,
          textAlign: "center",
        },
        props.style,
      ]}
    />
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.btn, { backgroundColor: THEME.primary, alignSelf: "center" }]}
      android_ripple={{ color: "rgba(255,255,255,0.15)" }}
    >
      <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

/** Contenedor responsive: centrado + maxWidth */
function ResponsiveContainer({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const maxWidth = width >= 980 ? 980 : width >= 760 ? 760 : width;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 }}>
      <View
        style={{
          width: "100%",
          maxWidth,
          alignSelf: "center",
          gap: 12,
          alignItems: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const [tab, setTab] = React.useState<"month" | "year">("month");

  // ✅ Arranca cargado con el mes actual, pero lo podés editar a mano
  const [monthKey, setMonthKey] = React.useState(() => nowMonthKey());
  const [year, setYear] = React.useState(() => new Date().getFullYear());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg }}>
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <AppHeader title="Estadísticas" />

        <ResponsiveContainer>
          <View style={s.tabsRow}>
            <Pill label="Mensual" active={tab === "month"} onPress={() => setTab("month")} />
            <Pill label="Anual" active={tab === "year"} onPress={() => setTab("year")} />
          </View>
        </ResponsiveContainer>

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
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const currentMonth = React.useMemo(() => nowMonthKey(), []);
  const { incomePaid, incomePending, supplies, net, setMonthlySupplies } = useMonthlyStats(monthKey);

  const [supInput, setSupInput] = React.useState(String(supplies));
  React.useEffect(() => setSupInput(String(supplies)), [supplies]);

  // ✅ Validación suave: deja escribir, pero si no cumple, no cambia stats todavía
  function onChangeMonth(v: string) {
    const clean = v.replace(/[^\d-]/g, "");
    setMonthKey(clean);
  }

  async function saveSupplies() {
    const n = Number(supInput);
    if (!Number.isFinite(n) || n < 0) return Alert.alert("Insumos inválido", "Usá un número >= 0");
    await setMonthlySupplies(n);
    Alert.alert("Listo", "Insumos guardados 💖");
  }

  const isValidMonthKey = /^\d{4}-\d{2}$/.test(monthKey);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 26 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <ResponsiveContainer>
        <View style={[{ gap: 12, width: "100%", alignItems: "center" }, isWide ? s.centerCol : null]}>
          <Card style={s.fullCentered}>
            <FieldLabel>Mes (YYYY-MM)</FieldLabel>

            <Input
              value={monthKey}
              onChangeText={onChangeMonth}
              placeholder={currentMonth}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {!isValidMonthKey ? (
              <Text style={{ color: THEME.muted, fontWeight: "800", textAlign: "center" }}>
                Formato esperado: <Text style={{ fontWeight: "900", color: THEME.text }}>YYYY-MM</Text>
                {"\n"}Ej: {currentMonth}
              </Text>
            ) : (
              <Text style={{ color: THEME.muted, fontWeight: "800", textAlign: "center" }}>
                Mes aplicado: <Text style={{ color: THEME.text, fontWeight: "900" }}>{monthKey}</Text>
              </Text>
            )}
          </Card>

          <Card style={s.fullCentered}>
            <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 16, textAlign: "center" }}>
              Resumen
            </Text>

            <View style={{ gap: 6, alignItems: "center" }}>
              <Text style={{ color: THEME.muted, fontWeight: "800", textAlign: "center" }}>
                Ingresos (pagados): ${incomePaid}
              </Text>
              <Text style={{ color: THEME.muted, fontWeight: "800", textAlign: "center" }}>
                Pendiente por cobrar: ${incomePending}
              </Text>
              <Text style={{ color: THEME.muted, fontWeight: "800", textAlign: "center" }}>
                Insumos: ${supplies}
              </Text>
            </View>

            <View style={[s.highlight, { backgroundColor: THEME.primarySoft, borderColor: THEME.border }]}>
              <Text style={{ fontWeight: "900", color: THEME.primary, fontSize: 16, textAlign: "center" }}>
                Resultado: ${net}
              </Text>
            </View>
          </Card>

          <Card style={s.fullCentered}>
            <FieldLabel>Cargar insumos del mes</FieldLabel>
            <Input
              value={supInput}
              onChangeText={setSupInput}
              keyboardType={Platform.OS === "web" ? "default" : "numeric"}
              inputMode="decimal"
              placeholder="0"
            />
            <PrimaryButton label="Guardar insumos" onPress={saveSupplies} />
          </Card>
        </View>
      </ResponsiveContainer>
    </ScrollView>
  );
}

function YearlyView({ year, setYear }: any) {
  const { months, totalPaid, avgMonthly } = useYearlyStats(year);

  return (
    <FlatList
      style={{ flex: 1 }}
      data={months}
      keyExtractor={(it) => it.monthKey}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      showsVerticalScrollIndicator
      contentContainerStyle={{ paddingBottom: 26 }}
      ListHeaderComponent={
        <ResponsiveContainer>
          <View style={{ gap: 12, width: "100%", alignItems: "center" }}>
            <Card style={s.fullCentered}>
              <FieldLabel>Año</FieldLabel>
              <Input
                value={String(year)}
                onChangeText={(v: string) => {
                  const clean = v.replace(/[^\d]/g, "");
                  const n = Number(clean);
                  if (Number.isFinite(n)) setYear(n);
                }}
                keyboardType={Platform.OS === "web" ? "default" : "numeric"}
                inputMode="numeric"
                placeholder={String(new Date().getFullYear())}
              />
            </Card>

            <Card style={s.fullCentered}>
              <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 16, textAlign: "center" }}>
                Resumen anual
              </Text>
              <Text style={{ color: THEME.muted, fontWeight: "800", textAlign: "center" }}>
                Total cobrado: ${totalPaid}
              </Text>
              <Text style={{ color: THEME.muted, fontWeight: "800", textAlign: "center" }}>
                Promedio mensual: ${Math.round(avgMonthly)}
              </Text>
            </Card>

            <View style={{ alignItems: "center" }}>
              <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 16, textAlign: "center" }}>
                Mes a mes
              </Text>
              <Text style={{ color: THEME.muted, fontWeight: "800", textAlign: "center" }}>
                Scroll para ver todos los meses.
              </Text>
            </View>
          </View>
        </ResponsiveContainer>
      }
      renderItem={({ item }) => (
        <ResponsiveContainer>
          <Card style={s.fullCentered}>
            <Text style={{ fontWeight: "900", color: THEME.text, textAlign: "center" }}>{item.monthKey}</Text>
            <Text style={{ color: THEME.muted, fontWeight: "800", textAlign: "center" }}>
              Cobrado: ${item.paid}
            </Text>
            <Text style={{ color: THEME.muted, fontWeight: "800", textAlign: "center" }}>
              Pendiente: ${item.pending}
            </Text>
          </Card>
        </ResponsiveContainer>
      )}
    />
  );
}

const s = StyleSheet.create({
  tabsRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    alignSelf: "center",
  },

  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },

  fullCentered: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    alignItems: "center",
  },

  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontWeight: "900",
  },

  btn: {
    width: "100%",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },

  highlight: {
    marginTop: 6,
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },

  centerCol: {
    alignSelf: "center",
  },
});