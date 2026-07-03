import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { THEME } from "./src/lib/theme";
import { useAuthUser } from "./src/hooks/useAuthUser";

export default function Index() {
  const { user, loading: authLoading } = useAuthUser();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading]);

  // Fallback de 2.5 segundos para no quedarse colgado en el loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg, justifyContent: "center" }}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return user ? <Redirect href="/(tabs)/calendar" /> : <Redirect href="/(auth)/login" />;
}