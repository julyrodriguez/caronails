import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";

import { auth } from "../lib/firebase";
import { THEME } from "../lib/theme";

type Props = {
  title?: string;
  subtitle?: string;
  showLogout?: boolean;
  hideSettings?: boolean;
};

export default function AppHeader({
  title = "Caro Nails",
  subtitle,
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
        paddingTop: Platform.OS === "ios" ? 48 : 16,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: THEME.bg,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(233, 210, 220, 0.5)", // THEME.border soft
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 10,
        ...Platform.select({
          web: {
            position: "sticky",
            top: 0,
            backdropFilter: "blur(8px)",
            backgroundColor: "rgba(250, 245, 248, 0.85)", // THEME.bg glassmorphic
          },
        }) as any,
      }}
    >
      {/* Title & Subtitle Section */}
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 22,
            fontWeight: "900",
            color: THEME.text,
            letterSpacing: -0.3,
          }}
        >
          {title} {title === "Caro Nails" && "💅"}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13,
              color: THEME.muted,
              fontWeight: "600",
              marginTop: 1,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Action Buttons Section */}
      {showLogout ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {!hideSettings && (
            <Pressable
              onPress={goToSettings}
              style={({ pressed }) => ({
                backgroundColor: THEME.primarySoft,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 14,
                width: 40,
                height: 40,
                justifyContent: "center",
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              })}
            >
              <Text style={{ fontSize: 18, color: THEME.primary }}>⚙️</Text>
            </Pressable>
          )}
          
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => ({
              backgroundColor: THEME.primary,
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 16,
              justifyContent: "center",
              alignItems: "center",
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
              shadowColor: THEME.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.16,
              shadowRadius: 8,
            })}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "900",
                fontSize: 14,
              }}
            >
              Salir
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}