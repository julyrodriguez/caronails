import React from "react";
import { Tabs,Redirect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { THEME } from "../src/lib/theme"; // si tu THEME está ahí, sino ajustá


import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuthUser } from "../src/hooks/useAuthUser";
import { useWebPushNotifications } from "../src/hooks/useWebPushNotifications";

export default function TabsLayout() {
  const { user, loading } = useAuthUser();
  useWebPushNotifications(user);

  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.muted,
        tabBarStyle: {
          backgroundColor: THEME.card,
          borderTopColor: "rgba(233, 210, 220, 0.4)",
          height: 68,
          paddingBottom: Platform.OS === "ios" ? 18 : 10,
          paddingTop: 8,
          shadowColor: "#2E1E2F",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.02,
          shadowRadius: 10,
          ...Platform.select({
            web: {
              backdropFilter: "blur(12px)",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            },
          }) as any,
        },
        tabBarLabelStyle: { fontWeight: "900", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="calendar/index"
        options={{
          title: "Calendario",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="calendar-heart"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* ✅ Ocultar pantallas internas para que NO aparezcan como tabs */}
      <Tabs.Screen name="calendar/month" options={{ href: null }} />
      <Tabs.Screen name="calendar/day/[dayKey]" options={{ href: null }} />
      <Tabs.Screen name="calendar/day" options={{ href: null }} />

      <Tabs.Screen
        name="appointments"
        options={{
          title: "Turnos",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-plus" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="clients"
        options={{
          title: "Clientas",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-heart" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: "Estadísticas",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="faculty"
        options={{
          title: "Facultad",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="school" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}