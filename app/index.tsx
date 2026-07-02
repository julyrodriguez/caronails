import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { THEME } from "./src/lib/theme";
import { useAuthUser } from "./src/hooks/useAuthUser";

export default function Index() {
  const { user, loading } = useAuthUser();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return user ? <Redirect href="/(tabs)/calendar" /> : <Redirect href="/(auth)/login" />;
}