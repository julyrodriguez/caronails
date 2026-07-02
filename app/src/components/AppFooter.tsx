import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useRouter, Href } from "expo-router";
import { THEME } from "../lib/theme";

type Props = {
  showBack?: boolean;
  backHref?: Href;
  showMenu?: boolean;
  menuHref?: Href;
};

export default function AppFooter({
  showBack = false,
  backHref,
  showMenu = false,
  menuHref,
}: Props) {
  const router = useRouter();

  function onBack() {
    if (backHref) return router.replace(backHref);
    if (Platform.OS === "web") return router.replace("/(tabs)/calendar");
    router.back();
  }

  function onMenu() {
    if (menuHref) return router.replace(menuHref);
    router.replace("/(tabs)/calendar");
  }

  if (!showBack && !showMenu) return null;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === "ios" ? 28 : 16,
        backgroundColor: "rgba(250, 245, 248, 0.9)", // Glassy THEME.bg
        borderTopWidth: 1,
        borderTopColor: "rgba(233, 210, 220, 0.4)", // THEME.border soft
        ...Platform.select({
          web: {
            backdropFilter: "blur(12px)",
          },
        }) as any,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 12,
          maxWidth: 560,
          alignSelf: "center",
          width: "100%",
        }}
      >
        {showMenu ? (
          <Pressable
            onPress={onMenu}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: THEME.primarySoft,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 14,
              paddingVertical: 12,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text style={{ color: THEME.primary, fontWeight: "900", fontSize: 14 }}>
              ← Volver
            </Text>
          </Pressable>
        ) : null}

        {showBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: THEME.primary,
              borderRadius: 14,
              paddingVertical: 12,
              alignItems: "center",
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              shadowColor: THEME.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
            })}
          >
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
              Inicio
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}