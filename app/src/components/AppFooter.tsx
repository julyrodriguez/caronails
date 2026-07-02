import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useRouter, Href } from "expo-router";
import { THEME } from "../lib/theme";

type Props = {
  showBack?: boolean;
  backHref?: Href;
  onBack?: Href
  showMenu?: boolean;
  menuHref?: Href;
};

function PillButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: THEME.primarySoft,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 999,
        paddingVertical: 10,
        paddingHorizontal: 14,
        minWidth: 120,
        alignItems: "center",
      }}
    >
      <Text style={{ color: THEME.primary, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

export default function AppFooter({
  showBack = false,
  backHref,
  showMenu = false,
  menuHref,
}: Props) {
  const router = useRouter();

  function onBack() {
    if (backHref) return router.replace(backHref);
    if (Platform.OS === "web") return router.replace("/");
    router.back();
  }

  function onMenu() {
    if (menuHref) return router.replace(menuHref);
    router.replace("/");
  }

  if (!showBack && !showMenu) return null;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 16,
        backgroundColor: THEME.bg,
        borderTopWidth: 1,
        borderTopColor: THEME.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          {showMenu ? <PillButton label="← Volver" onPress={onMenu} /> : null}
        </View>

        <View style={{ flex: 1 }}>
          {showBack ? <PillButton label="Inicio" onPress={onBack} /> : null}
        </View>
      </View>
    </View>
  );
}