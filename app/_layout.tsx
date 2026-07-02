import { Stack } from "expo-router";
import React from "react";
import { requestNotificationPermissions } from "./src/lib/notifications";

export default function RootLayout() {
  React.useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}