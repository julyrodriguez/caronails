import React from "react";
import { Tabs,Redirect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { THEME } from "../src/lib/theme"; // si tu THEME está ahí, sino ajustá


import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuthUser } from "../src/hooks/useAuthUser";

export default function TabsLayout() {
  const { user, loading } = useAuthUser();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.primary,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: THEME.border,
          height: 64,
          paddingBottom: 0,
          paddingTop: 5,
          
        },
        tabBarLabelStyle: { fontWeight: "800" },
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
          title: "Estadisticas",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}