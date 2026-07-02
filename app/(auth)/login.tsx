import React from "react";
import {
  View,
  Text,
  TextInput,
  Animated,
  Pressable,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { auth } from "../src/lib/firebase";
import { THEME } from "../src/lib/theme";

export default function LoginScreen() {
  const router = useRouter();

  const [user, setUser] = React.useState("");
  const [pass, setPass] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const scale = React.useRef(new Animated.Value(1)).current;

  const email = `${(user || "").trim().toLowerCase()}@equipo.local`;

  function pressIn() {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }

  function pressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }

  async function login() {
    if (loading) return;
    setError("");

    if (user.trim().toLowerCase() !== "caro") {
      setError("Usuario no autorizado");
      return;
    }

    if (!pass.trim()) {
      setError("Por favor ingresa tu contraseña");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
      router.replace("/(tabs)/calendar");
    } catch (e: any) {
      setError("Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.container}>
      
      {/* Dynamic Ambient Blur Orbs for Web background */}
      {Platform.OS === "web" && (
        <>
          <View style={[s.blurOrb, s.orb1] as any} />
          <View style={[s.blurOrb, s.orb2] as any} />
          <View style={[s.blurOrb, s.orb3] as any} />
        </>
      )}

      {/* Main Glass Card Form Container */}
      <View style={s.card}>
        
        {/* Logo / Header Branding */}
        <View style={s.header}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>CN</Text>
          </View>
          <Text style={s.brandName}>Caro Nails</Text>
          <Text style={s.brandSlogan}>Studio de Belleza & Cuidado Profesional</Text>
        </View>

        {/* Input: Usuario */}
        <View style={s.formGroup}>
          <Text style={s.label}>Usuario</Text>
          <View style={[s.inputContainer, !!error && s.inputError]}>
            <MaterialCommunityIcons name="account-outline" size={20} color={THEME.primary} style={s.inputIcon} />
            <TextInput
              value={user}
              onChangeText={(v) => {
                setUser(v);
                setError("");
              }}
              autoCapitalize="none"
              placeholder="Introduce tu usuario..."
              placeholderTextColor={THEME.muted}
              editable={!loading}
              style={s.input}
            />
          </View>
        </View>

        {/* Input: Contraseña */}
        <View style={s.formGroup}>
          <Text style={s.label}>Contraseña</Text>
          <View style={[s.inputContainer, !!error && s.inputError]}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={THEME.primary} style={s.inputIcon} />
            <TextInput
              value={pass}
              onChangeText={(v) => {
                setPass(v);
                setError("");
              }}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor={THEME.muted}
              editable={!loading}
              style={s.input}
              onSubmitEditing={login}
            />
            <Pressable onPress={() => setShowPassword((p) => !p)} style={s.eyeButton}>
              <MaterialCommunityIcons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={THEME.muted}
              />
            </Pressable>
          </View>
        </View>

        {/* Inline error feedback banner */}
        {!!error && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Action Submit Button */}
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            onPress={login}
            onPressIn={pressIn}
            onPressOut={pressOut}
            disabled={loading}
            style={s.submitButton}
          >
            {loading ? (
              <View style={s.loadingWrapper}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.submitButtonText}>Verificando acceso...</Text>
              </View>
            ) : (
              <Text style={s.submitButtonText}>Entrar a mi Agenda ✨</Text>
            )}
          </Pressable>
        </Animated.View>

      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      web: {
        backgroundImage: "linear-gradient(145deg, #FAF7F8 0%, #F3EBEF 100%)",
      },
    }),
  },
  blurOrb: {
    position: "absolute",
    borderRadius: 9999,
    zIndex: 0,
    ...Platform.select({
      web: {
        filter: "blur(70px)",
      },
    }),
  },
  orb1: {
    width: 260,
    height: 260,
    backgroundColor: "rgba(184, 138, 159, 0.15)", // primary
    top: "10%",
    left: "10%",
  },
  orb2: {
    width: 320,
    height: 320,
    backgroundColor: "rgba(137, 118, 155, 0.12)", // secondary / academic purple
    bottom: "10%",
    right: "10%",
  },
  orb3: {
    width: 200,
    height: 200,
    backgroundColor: "rgba(212, 140, 158, 0.1)",
    top: "40%",
    right: "30%",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: THEME.card,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(233, 210, 220, 0.5)",
    paddingHorizontal: 28,
    paddingVertical: 36,
    zIndex: 1,
    shadowColor: "#2E1E2F",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    ...Platform.select({
      web: {
        backdropFilter: "blur(12px)",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
      },
    }),
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: {
    fontWeight: "900",
    color: THEME.primary,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  brandName: {
    fontSize: 26,
    fontWeight: "900",
    color: THEME.text,
    letterSpacing: -0.5,
  },
  brandSlogan: {
    fontSize: 12,
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontWeight: "900",
    color: THEME.text,
    fontSize: 12,
    marginBottom: 6,
    paddingLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    backgroundColor: THEME.bg,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontWeight: "700",
    color: THEME.text,
    fontSize: 15,
  },
  eyeButton: {
    padding: 6,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.15)",
  },
  errorText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: THEME.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    ...Platform.select({
      web: {
        backgroundImage: "linear-gradient(135deg, #B88A9F 0%, #A6768C 100%)",
      },
    }),
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  loadingWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});