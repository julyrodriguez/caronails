import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";

import { auth } from "../lib/firebase";
import { THEME } from "../lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  showLogout?: boolean;
  hideSettings?: boolean;
};

function PillButton({
  label,
  onPress,
  variant = "soft",
}: {
  label: string;
  onPress: () => void;
  variant?: "soft" | "primary";
}) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: isPrimary ? THEME.primary : THEME.primarySoft,
        borderWidth: 1,
        borderColor: isPrimary ? THEME.primary : THEME.border,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 12,
      }}
    >
      <Text
        style={{
          color: isPrimary ? "#fff" : THEME.primary,
          fontWeight: "900",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AppHeader({
  subtitle = "Caro Nails ",
  showLogout = true,
  hideSettings = false,
}: Props) {
  const router = useRouter();

  async function onLogout() {
    await signOut(auth);
    router.replace("/(auth)/login");
  }

  function goToSettings() {
    router.push("/settings/faculty-schedule" as any);
  }

  return (
    <View
      style={{
        paddingTop: 5,
        paddingBottom: 14,
        paddingHorizontal: 16,
        backgroundColor: THEME.bg,
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
      }}
    >
      {/* Settings y Salir arriba a la derecha */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, top: 40, zIndex: 999 }}>
        {showLogout ? (
          <>
            {!hideSettings && (
              <Pressable
                onPress={goToSettings}
                style={{
                  backgroundColor: THEME.primarySoft,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 999,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 16, color: THEME.primary }}>⚙️</Text>
              </Pressable>
            )}
            <PillButton label="Salir" onPress={onLogout} variant="primary" />
          </>
        ) : null}
      </View>

      <View style={{ marginTop: 10 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "900",
            color: THEME.text,
            textAlign: "center",
          }}
        >
          {subtitle}
        </Text>
        <Text
          style={{
            marginTop: 2,
            color: THEME.muted,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          
        </Text>
      </View>
    </View>
  );
}