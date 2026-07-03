import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { THEME } from "./src/lib/theme";
import { useAuthUser } from "./src/hooks/useAuthUser";

export default function Index() {
  const { user, loading: authLoading } = useAuthUser();
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    if (!authLoading) {
      setLoading(false);
      if (user) {
        router.replace("/(tabs)/calendar");
      } else {
        router.replace("/(auth)/login");
      }
    }
  }, [user, authLoading]);

  // Fallback de 2.5 segundos para no quedarse colgado en el loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        if (user) {
          router.replace("/(tabs)/calendar");
        } else {
          router.replace("/(auth)/login");
        }
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [user, loading]);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={THEME.primary} />
    </View>
  );
}