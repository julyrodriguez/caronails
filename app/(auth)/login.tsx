import React from "react";
import {
  View,
  Text,
  TextInput,
  Animated,
  Pressable,
  ActivityIndicator,
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
      toValue: 0.97,
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
      setError("Usuario inválido");
      return;
    }

    if (!pass.trim()) {
      setError("Ingresá la contraseña");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
      router.replace("/(tabs)/calendar");
    } catch (e: any) {
      setError("Contraseña incorrecta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: THEME.bg,
        padding: 24,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: THEME.card,
          borderWidth: 1,
          borderColor: THEME.border,
          borderRadius: 24,
          padding: 20,
        }}
      >
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 30, fontWeight: "900", color: THEME.primary }}>
            Caro Nails 💅
          </Text>
          <Text
            style={{
              marginTop: 6,
              color: THEME.muted,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            Ingresá para gestionar turnos y clientas
          </Text>
        </View>

        {/* Usuario */}
        <Text
          style={{
            fontWeight: "900",
            color: THEME.text,
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          Usuario
        </Text>

        <TextInput
          value={user}
          onChangeText={(v) => {
            setUser(v);
            setError("");
          }}
          autoCapitalize="none"
          placeholder="User"
          placeholderTextColor={THEME.muted}
          editable={!loading}
          style={{
            backgroundColor: THEME.bg,
            borderWidth: 1,
            borderColor: error ? "#ef4444" : THEME.border,
            borderRadius: 16,
            padding: 14,
            marginBottom: 14,
            fontWeight: "900",
            color: THEME.text,
            textAlign: "center",
          }}
        />

        {/* Contraseña */}
        <Text
          style={{
            fontWeight: "900",
            color: THEME.text,
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          Contraseña
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: error ? "#ef4444" : THEME.border,
            borderRadius: 16,
            backgroundColor: THEME.bg,
            paddingHorizontal: 12,
            marginBottom: 6,
          }}
        >
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
            style={{
              flex: 1,
              paddingVertical: 14,
              fontWeight: "900",
              color: THEME.text,
              textAlign: "center",
            }}
            onSubmitEditing={login}
          />

          <Pressable onPress={() => setShowPassword((p) => !p)}>
            <MaterialCommunityIcons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color={THEME.muted}
            />
          </Pressable>
        </View>

        {/* ERROR INLINE */}
        {error ? (
          <Text
            style={{
              color: "#ef4444",
              fontWeight: "800",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            {error}
          </Text>
        ) : null}

        {/* BOTÓN */}
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            onPress={login}
            onPressIn={pressIn}
            onPressOut={pressOut}
            disabled={loading}
            style={{
              backgroundColor: THEME.primary,
              borderRadius: 18,
              paddingVertical: 14,
              alignItems: "center",
              opacity: loading ? 0.85 : 1,
            }}
          >
            {loading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
                  Ingresando...
                </Text>
              </View>
            ) : (
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
                Ingresar
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}