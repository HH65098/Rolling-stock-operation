import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { authStorage } from "@/src/lib/auth";
import { colors } from "@/src/lib/theme";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await authStorage.getToken();
      if (token) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    })();
  }, [router]);

  return (
    <View style={styles.container} testID="index-loading">
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
